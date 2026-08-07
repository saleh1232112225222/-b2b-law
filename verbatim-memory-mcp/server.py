import sys
import json
import traceback
import io
from db import VerbatimMemoryDB

# Force stdin/stdout/stderr to UTF-8 to handle Arabic and special characters correctly on Windows
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

db = VerbatimMemoryDB()

def log(msg):
    sys.stderr.write(f"[VerbatimMemory Log] {msg}\n")
    sys.stderr.flush()

def send_response(req_id, result=None, error=None):
    response = {
        "jsonrpc": "2.0",
        "id": req_id
    }
    if error is not None:
        response["error"] = error
    else:
        response["result"] = result
        
    response_str = json.dumps(response, ensure_ascii=False)
    sys.stdout.write(response_str + "\n")
    sys.stdout.flush()

def handle_request(req):
    method = req.get("method")
    params = req.get("params", {})
    req_id = req.get("id")
    
    # If there's no ID, it's a notification, so we don't send a response
    is_notification = req_id is None
    
    try:
        if method == "initialize":
            result = {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "verbatim-memory",
                    "version": "1.0.0"
                }
            }
            if not is_notification:
                send_response(req_id, result=result)
                
        elif method == "notifications/initialized":
            log("Client successfully initialized MCP connection.")
            
        elif method == "tools/list":
            result = {
                "tools": [
                    {
                        "name": "store_transcript",
                        "description": "Store a complete, verbatim chat session transcript locally.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "session_id": {
                                    "type": "string",
                                    "description": "Unique identifier for the session (e.g. UUID, conversation ID)"
                                },
                                "project_name": {
                                    "type": "string",
                                    "description": "Name of the project or workspace associated with the session"
                                },
                                "transcript": {
                                    "type": "string",
                                    "description": "The complete, verbatim text of the chat conversation"
                                }
                            },
                            "required": ["session_id", "project_name", "transcript"]
                        }
                    },
                    {
                        "name": "search_transcripts",
                        "description": "Search stored verbatim transcripts using Full Text Search (FTS5) for precise retrieval.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The search term or phrase to find in stored transcripts"
                                },
                                "project_name": {
                                    "type": "string",
                                    "description": "Optional project filter to restrict search results"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of search results to return (default: 5)"
                                }
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "get_session_transcript",
                        "description": "Retrieve the full verbatim transcript of a specific session.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "session_id": {
                                    "type": "string",
                                    "description": "The session ID to retrieve"
                                }
                            },
                            "required": ["session_id"]
                        }
                    }
                ]
            }
            if not is_notification:
                send_response(req_id, result=result)
                
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            if tool_name == "store_transcript":
                session_id = arguments.get("session_id")
                project_name = arguments.get("project_name")
                transcript = arguments.get("transcript")
                
                db.save_transcript(session_id, project_name, transcript)
                result = {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Successfully stored verbatim transcript for session '{session_id}' in project '{project_name}'."
                        }
                    ]
                }
                if not is_notification:
                    send_response(req_id, result=result)
                    
            elif tool_name == "search_transcripts":
                query = arguments.get("query")
                project_name = arguments.get("project_name")
                limit = arguments.get("limit", 5)
                
                results = db.search_transcripts(query, project_name, limit)
                if not results:
                    result = {
                        "content": [
                            {
                                "type": "text",
                                "text": f"No verbatim transcript matches found for query '{query}'."
                            }
                        ]
                    }
                else:
                    formatted_results = []
                    for r in results:
                        formatted_results.append(
                            f"--- Session: {r['session_id']} (Project: {r['project_name']}, Saved: {r['timestamp']}) ---\n"
                            f"{r['transcript']}\n"
                        )
                    result = {
                        "content": [
                            {
                                "type": "text",
                                "text": "\n".join(formatted_results)
                            }
                        ]
                    }
                if not is_notification:
                    send_response(req_id, result=result)
                    
            elif tool_name == "get_session_transcript":
                session_id = arguments.get("session_id")
                res = db.get_session_transcript(session_id)
                if not res:
                    result = {
                        "content": [
                            {
                                "type": "text",
                                "text": f"Session with ID '{session_id}' not found."
                            }
                        ],
                        "isError": True
                    }
                else:
                    result = {
                        "content": [
                            {
                                "type": "text",
                                "text": f"--- Session: {res['session_id']} (Project: {res['project_name']}, Saved: {res['timestamp']}) ---\n{res['transcript']}"
                            }
                        ]
                    }
                if not is_notification:
                    send_response(req_id, result=result)
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
                
        else:
            if not is_notification:
                send_response(req_id, error={
                    "code": -32601,
                    "message": f"Method not found: {method}"
                })
                
    except Exception as e:
        log(f"Error handling request: {str(e)}\n{traceback.format_exc()}")
        if not is_notification:
            send_response(req_id, error={
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            })

def main():
    log("Verbatim Memory MCP Server started.")
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                handle_request(req)
            except json.JSONDecodeError:
                log(f"Received invalid JSON: {line}")
    except KeyboardInterrupt:
        log("Server shutting down due to KeyboardInterrupt.")
    except Exception as e:
        log(f"Fatal server exception: {str(e)}")

if __name__ == "__main__":
    main()
