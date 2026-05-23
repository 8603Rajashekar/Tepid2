import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import psycopg2

url = os.environ["SYNC_DATABASE_URL"]
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

cur.execute("SELECT unnest(enum_range(NULL::user_role))::text")
vals = [r[0] for r in cur.fetchall()]
print("Current user_role enum values:", vals)

if "crm" not in vals:
    cur.execute("ALTER TYPE user_role ADD VALUE 'crm'")
    print("Added 'crm' to user_role enum")
else:
    print("'crm' already exists in enum")

cur.close()
conn.close()
print("Done.")
