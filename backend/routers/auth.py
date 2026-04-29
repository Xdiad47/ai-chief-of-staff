import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials, firestore as firebase_firestore
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialise Firebase Admin SDK (idempotent guard)
if not firebase_admin._apps:
    firebase_admin.initialize_app()


# ── Request / Response schemas ────────────────────────────────────────────────

class TokenRequest(BaseModel):
    id_token: str


class RegisterCompanyRequest(BaseModel):
    name: str
    domain: str
    admin_email: EmailStr


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/verify")
async def verify_token(body: TokenRequest):
    """Verify a Firebase ID token and return user info + role."""
    try:
        decoded = firebase_auth.verify_id_token(body.id_token)
        uid = decoded["uid"]
        email = decoded.get("email", "")

        # Determine role from custom claims (set at registration time)
        role = decoded.get("role", "employee")

        return {
            "uid": uid,
            "email": email,
            "role": role,
        }
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=500, detail="Token verification error.")


@router.post("/register-company")
async def register_company(body: RegisterCompanyRequest):
    try:
        from google.cloud import firestore
        db = firestore.Client()

        existing = db.collection("companies").where(
            filter=firebase_firestore.firestore.FieldFilter("domain", "==", body.domain)
        ).limit(1).stream()

        if any(True for _ in existing):
            raise HTTPException(status_code=409, detail="A company with this domain already exists.")

        _, doc_ref = db.collection("companies").add({
            "name": body.name,
            "domain": body.domain,
            "admin_email": body.admin_email,
        })

        company_id = doc_ref.id

        # Set custom claim on the admin Firebase user
        try:
            admin_user = firebase_auth.get_user_by_email(body.admin_email)
            firebase_auth.set_custom_user_claims(admin_user.uid, {
                "role": "admin",
                "company_id": company_id
            })
            logger.info(f"✅ Set admin claims for {body.admin_email}")
        except Exception as claim_error:
            logger.warning(f"⚠️ Could not set custom claims: {claim_error}")

        return {"company_id": company_id, "message": "Company registered successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company registration failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to register company.")

@router.get("/role-check")
async def role_check(email: str):
    """Check if an email belongs to a company admin."""
    try:
        from google.cloud import firestore
        db = firestore.Client()

        # Check if email is a company admin
        companies = db.collection("companies").where(
            filter=firebase_firestore.firestore.FieldFilter("admin_email", "==", email)
        ).limit(1).stream()

        for company in companies:
            return {"role": "admin", "company_id": company.id}

        return {"role": "employee"}
    except Exception as e:
        logger.error(f"Role check failed: {e}")
        return {"role": "employee"}
