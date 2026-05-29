"""
Add co_assignees (JSON) and submission_remarks (TEXT) columns to tasks table.
Safe to run multiple times — checks column existence first.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import create_engine, text

SYNC_URL = os.environ["SYNC_DATABASE_URL"]
print("Connecting:", SYNC_URL[:60], "...")
engine = create_engine(SYNC_URL)

COLUMNS = [
    ("co_assignees",       "NVARCHAR(MAX)"),
    ("submission_remarks", "NVARCHAR(MAX)"),
]

with engine.connect() as conn:
    for col, col_type in COLUMNS:
        exists = conn.execute(text(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME='tasks' AND COLUMN_NAME=:col"
        ), {"col": col}).scalar()
        if exists:
            print(f"  ✓ {col} already exists — skipped")
        else:
            conn.execute(text(f"ALTER TABLE tasks ADD {col} {col_type} NULL"))
            print(f"  + Added column: {col} {col_type}")
    conn.commit()

print("\nDone.")
