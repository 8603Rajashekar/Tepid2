import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import psycopg2

conn = psycopg2.connect(os.environ["SYNC_DATABASE_URL"])
cur = conn.cursor()

# Check tasks table columns
cur.execute("""
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'tasks'
    ORDER BY ordinal_position
""")
print("TASKS TABLE COLUMNS:")
for row in cur.fetchall():
    print(f"  {row[0]:<30} {row[1]:<20} {row[2]}")

# Check if tasks table has any rows
cur.execute("SELECT COUNT(*) FROM tasks")
print(f"\nTask count: {cur.fetchone()[0]}")

# Check PostgreSQL enum types that exist
cur.execute("""
    SELECT typname FROM pg_type WHERE typtype = 'e'
""")
print("\nPostgreSQL ENUM types:")
for row in cur.fetchall():
    print(f"  {row[0]}")

cur.close()
conn.close()
