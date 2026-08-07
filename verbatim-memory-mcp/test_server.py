import unittest
import os
import shutil
import tempfile
import sys

# Add current folder to path to allow import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import VerbatimMemoryDB
import server

class TestVerbatimMemory(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for DB testing
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_memory.db")
        self.db = VerbatimMemoryDB(db_path=self.db_path)

    def tearDown(self):
        # Clean up database files
        shutil.rmtree(self.test_dir)

    def test_database_operations(self):
        session_id = "test-session-123"
        project_name = "test-project"
        transcript = (
            "User: Hello, I need to configure the database schema.\n"
            "Assistant: Sure! We can use Postgres with Alloydb or SQLite locally. "
            "Let's make sure we implement verbatim memory properly so that no details are lost."
        )

        # 1. Test saving transcript
        self.db.save_transcript(session_id, project_name, transcript)
        
        # 2. Test retrieving transcript
        retrieved = self.db.get_session_transcript(session_id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["session_id"], session_id)
        self.assertEqual(retrieved["project_name"], project_name)
        self.assertEqual(retrieved["transcript"], transcript)

        # 3. Test FTS5 searching
        # Exact match query
        results = self.db.search_transcripts("verbatim memory", project_name=project_name)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["session_id"], session_id)
        
        # Non-matching query
        results = self.db.search_transcripts("unrelated terms search")
        self.assertEqual(len(results), 0)

        # 4. Test Upsert (Updating existing transcript)
        updated_transcript = transcript + "\nUser: Great! Let's do that."
        self.db.save_transcript(session_id, project_name, updated_transcript)
        
        retrieved = self.db.get_session_transcript(session_id)
        self.assertEqual(retrieved["transcript"], updated_transcript)

        # Search for updated terms
        results = self.db.search_transcripts("Great", project_name=project_name)
        self.assertEqual(len(results), 1)

    def test_json_rpc_routing(self):
        # Replace server's DB instance with the test one
        server.db = self.db
        
        # Capture stdout responses
        responses = []
        def mock_send_response(req_id, result=None, error=None):
            responses.append((req_id, result, error))
        
        server.send_response = mock_send_response

        # Test initialize
        server.handle_request({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {}
        })
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0][0], 1)
        self.assertEqual(responses[0][1]["serverInfo"]["name"], "verbatim-memory")
        
        responses.clear()

        # Test tools/list
        server.handle_request({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        })
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0][0], 2)
        tools = responses[0][1]["tools"]
        tool_names = [t["name"] for t in tools]
        self.assertIn("store_transcript", tool_names)
        self.assertIn("search_transcripts", tool_names)
        
        responses.clear()

        # Test storing via tools/call
        server.handle_request({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "store_transcript",
                "arguments": {
                    "session_id": "session-456",
                    "project_name": "rpc-project",
                    "transcript": "Verbatim content through JSON-RPC protocol"
                }
            }
        })
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0][0], 3)
        self.assertIn("Successfully stored", responses[0][1]["content"][0]["text"])

        responses.clear()

        # Test searching via tools/call
        server.handle_request({
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "search_transcripts",
                "arguments": {
                    "query": "JSON-RPC"
                }
            }
        })
        self.assertEqual(len(responses), 1)
        self.assertEqual(responses[0][0], 4)
        self.assertIn("session-456", responses[0][1]["content"][0]["text"])

if __name__ == "__main__":
    unittest.main()
