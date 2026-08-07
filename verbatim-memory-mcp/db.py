import os
import sqlite3
from datetime import datetime

class VerbatimMemoryDB:
    def __init__(self, db_path=None):
        if db_path is None:
            # Default to user home directory to act as a global persistent store
            home_dir = os.path.expanduser("~")
            db_dir = os.path.join(home_dir, ".verbatim-memory")
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, "memory.db")
        
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                
                # Create base table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS transcripts (
                    session_id TEXT PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    transcript TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """)
                
                # Create FTS5 virtual table
                cursor.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
                    session_id UNINDEXED,
                    project_name,
                    transcript
                )
                """)
                
                # Create triggers to sync FTS5 table with transcripts table
                cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS transcripts_ai AFTER INSERT ON transcripts BEGIN
                    INSERT INTO transcripts_fts(session_id, project_name, transcript)
                    VALUES (new.session_id, new.project_name, new.transcript);
                END;
                """)
                
                cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS transcripts_ad AFTER DELETE ON transcripts BEGIN
                    DELETE FROM transcripts_fts WHERE session_id = old.session_id;
                END;
                """)
                
                cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS transcripts_au AFTER UPDATE ON transcripts BEGIN
                    UPDATE transcripts_fts SET
                        project_name = new.project_name,
                        transcript = new.transcript
                    WHERE session_id = old.session_id;
                END;
                """)
        finally:
            conn.close()

    def save_transcript(self, session_id: str, project_name: str, transcript: str):
        conn = self.get_connection()
        try:
            with conn:
                cursor = conn.cursor()
                # Upsert into base table. Triggers will sync FTS5 automatically.
                cursor.execute("""
                INSERT OR REPLACE INTO transcripts (session_id, project_name, transcript, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """, (session_id, project_name, transcript))
        finally:
            conn.close()

    def search_transcripts(self, query: str, project_name: str = None, limit: int = 10):
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            results = []
            
            # Sanitize search term for FTS5 (double quote terms)
            clean_query = query.replace('"', ' ').replace("'", " ").strip()
            
            if not clean_query:
                return []

            try:
                if project_name:
                    cursor.execute("""
                    SELECT t.session_id, t.project_name, t.transcript, t.timestamp, fts.rank 
                    FROM transcripts_fts fts
                    JOIN transcripts t ON t.session_id = fts.session_id
                    WHERE transcripts_fts MATCH ? AND t.project_name = ?
                    ORDER BY fts.rank
                    LIMIT ?
                    """, (clean_query, project_name, limit))
                else:
                    cursor.execute("""
                    SELECT t.session_id, t.project_name, t.transcript, t.timestamp, fts.rank 
                    FROM transcripts_fts fts
                    JOIN transcripts t ON t.session_id = fts.session_id
                    WHERE transcripts_fts MATCH ?
                    ORDER BY fts.rank
                    LIMIT ?
                    """, (clean_query, limit))
                
                rows = cursor.fetchall()
            except sqlite3.OperationalError:
                # Fallback to LIKE if FTS query syntax was invalid
                like_term = f"%{clean_query}%"
                if project_name:
                    cursor.execute("""
                    SELECT session_id, project_name, transcript, timestamp, 0.0 as rank
                    FROM transcripts
                    WHERE (transcript LIKE ? OR project_name LIKE ?) AND project_name = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                    """, (like_term, like_term, project_name, limit))
                else:
                    cursor.execute("""
                    SELECT session_id, project_name, transcript, timestamp, 0.0 as rank
                    FROM transcripts
                    WHERE transcript LIKE ? OR project_name LIKE ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                    """, (like_term, like_term, limit))
                rows = cursor.fetchall()

            for row in rows:
                results.append({
                    "session_id": row[0],
                    "project_name": row[1],
                    "transcript": row[2],
                    "timestamp": row[3],
                    "rank": row[4]
                })
            
            return results
        finally:
            conn.close()

    def get_session_transcript(self, session_id: str):
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT session_id, project_name, transcript, timestamp 
            FROM transcripts 
            WHERE session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "session_id": row[0],
                    "project_name": row[1],
                    "transcript": row[2],
                    "timestamp": row[3]
                }
            return None
        finally:
            conn.close()
