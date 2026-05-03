import firebase_admin
from firebase_admin import credentials
from google.cloud import firestore

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.Client()

company_id = "9cHOeQMV4sGZ9GwBH3e8"
employees_ref = db.collection(f"companies/{company_id}/employees")
docs = list(employees_ref.stream())

default_balance = {"annual": 20, "casual": 5, "sick": 10}
fixed = 0

for doc in docs:
    data = doc.to_dict() or {}
    if not data.get("leave_balance"):
        doc.reference.update({"leave_balance": default_balance})
        print(f"✅ Fixed: {data.get('name')} ({doc.id})")
        fixed += 1
    else:
        print(f"⏭️  Skipped: {data.get('name')} — already has balance")

print(f"\nDone. Fixed {fixed} employees.")
