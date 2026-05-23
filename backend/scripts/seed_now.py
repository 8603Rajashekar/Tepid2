import sys, os
sys.path.insert(0, str(__file__).rsplit("\\scripts", 1)[0])

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User, UserRole

SYNC_URL = os.environ["SYNC_DATABASE_URL"]
print("Connecting:", SYNC_URL[:60], "...")

engine = create_engine(SYNC_URL)

USERS = [
    {"email": "admin@company.com",       "password": "Password@123", "full_name": "Administrator",    "department": "IT",         "designation": "System Administrator", "role": UserRole.admin},
    {"email": "supervisor@company.com",  "password": "Password@123", "full_name": "Team Supervisor",  "department": "Operations", "designation": "Field Supervisor",     "role": UserRole.supervisor},
    {"email": "coordinator@company.com", "password": "Password@123", "full_name": "Call Coordinator", "department": "Support",    "designation": "Service Coordinator",  "role": UserRole.coordinator},
    {"email": "finance@company.com",     "password": "Password@123", "full_name": "Finance Officer",  "department": "Finance",    "designation": "Finance Manager",      "role": UserRole.finance},
    {"email": "employee@company.com",    "password": "Password@123", "full_name": "Field Employee",   "department": "Field",      "designation": "Field Technician",     "role": UserRole.employee},
    {"email": "crm@fieldops.com",        "password": "Password@123", "full_name": "CRM Agent",        "department": "CRM",        "designation": "CRM Specialist",       "role": UserRole.crm},
]

with Session(engine) as db:
    for data in USERS:
        user = db.execute(select(User).where(User.email == data["email"])).scalar_one_or_none()
        if not user:
            user = User(
                full_name=data["full_name"], email=data["email"],
                department=data["department"], designation=data["designation"],
                role=data["role"], password_hash=hash_password(data["password"]), is_active=True,
            )
            db.add(user)
            print("  Created:", data["email"], data["role"].value)
        else:
            user.role = data["role"]
            user.password_hash = hash_password(data["password"])
            user.is_active = True
            print("  Updated:", data["email"], "->", data["role"].value)
    db.commit()

print("\nSeed complete. Login credentials:")
print("-" * 65)
print(f"{'Email':<35} {'Password':<16} Role")
print("-" * 65)
for u in USERS:
    print(f"{u['email']:<35} {u['password']:<16} {u['role'].value}")
