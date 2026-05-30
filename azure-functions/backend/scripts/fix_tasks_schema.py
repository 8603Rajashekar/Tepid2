import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import psycopg2

conn = psycopg2.connect(os.environ["SYNC_DATABASE_URL"])
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tasks'
""")
existing = {r[0] for r in cur.fetchall()}
print("Existing columns:", sorted(existing))

to_add = {
    "efficiency_score": "FLOAT",
}

for col, col_type in to_add.items():
    if col not in existing:
        cur.execute(f"ALTER TABLE tasks ADD COLUMN {col} {col_type}")
        print(f"  Added: {col} {col_type}")
    else:
        print(f"  Already exists: {col}")

cur.close()
conn.close()
print("Done.")
