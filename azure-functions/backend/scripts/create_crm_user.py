import psycopg2
import bcrypt
import uuid

conn = psycopg2.connect(
    host='localhost', port=5433,
    dbname='enterprise_field_ops',
    user='postgres', password='2026'
)
conn.autocommit = True
cur = conn.cursor()

# Add crm to enum
sql_enum = "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'crm'"
try:
    cur.execute(sql_enum)
    print("Added 'crm' to user_role enum")
except Exception as e:
    print(f"Enum: {e}")

conn.autocommit = False

# Hash password
hashed = bcrypt.hashpw(b'crm@2026', bcrypt.gensalt()).decode()
uid = str(uuid.uuid4())

try:
    cur.execute(
        """
        INSERT INTO users (id, full_name, email, phone, department, designation, role, password_hash, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE
            SET role = EXCLUDED.role,
                password_hash = EXCLUDED.password_hash,
                is_active = EXCLUDED.is_active
        """,
        (uid, 'CRM Agent', 'crm@fieldops.com', '9000000001', 'CRM', 'CRM Agent', 'crm', hashed, True)
    )
    conn.commit()
    print("CRM user ready: crm@fieldops.com / crm@2026")
except Exception as e:
    conn.rollback()
    print(f"User creation error: {e}")

cur.close()
conn.close()
