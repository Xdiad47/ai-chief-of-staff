import firebase_admin
from firebase_admin import credentials
from google.cloud import firestore

import os

if not firebase_admin._apps:
    firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
    firebase_private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")

    if firebase_project_id and firebase_private_key and firebase_client_email:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": firebase_project_id,
            "private_key": firebase_private_key.replace("\\n", "\n"),
            "client_email": firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
    else:
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
