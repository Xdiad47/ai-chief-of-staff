import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import random
import string
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, EmailStr
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials, firestore as firebase_firestore, storage as firebase_storage
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialise Firebase Admin SDK (idempotent guard)
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


# ── Gmail SMTP config (fastapi-mail) ─────────────────────────────────────────

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


# ── Helper: Slugify company name ───────────────────────────────────────────────

def slugify(name: str) -> str:
    """Convert 'Acme Corp' → 'acme-corp'."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def generate_company_id(name: str) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{slugify(name)}-{suffix}"


# ── Request schemas ────────────────────────────────────────────────────────────

class TokenRequest(BaseModel):
    id_token: str


class RegisterCompanyRequest(BaseModel):
    name: str
    domain: str
    admin_email: EmailStr


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


# ── Existing endpoints (unchanged) ────────────────────────────────────────────

@router.post("/verify")
async def verify_token(body: TokenRequest):
    """Verify a Firebase ID token and return user info + role."""
    try:
        decoded = firebase_auth.verify_id_token(body.id_token)
        uid = decoded["uid"]
        email = decoded.get("email", "")
        role = decoded.get("role", "employee")
        return {"uid": uid, "email": email, "role": role}
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=500, detail="Token verification error.")


@router.post("/register-company")
async def register_company_legacy(body: RegisterCompanyRequest):
    """Legacy company registration endpoint (domain-based)."""
    try:
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
        try:
            admin_user = firebase_auth.get_user_by_email(body.admin_email)
            firebase_auth.set_custom_user_claims(admin_user.uid, {
                "role": "admin",
                "company_id": company_id,
            })
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
        db = firestore.Client()
        companies = db.collection("companies").where(
            filter=firebase_firestore.firestore.FieldFilter("admin_email", "==", email)
        ).limit(1).stream()
        for company in companies:
            return {"role": "admin", "company_id": company.id}
        return {"role": "employee"}
    except Exception as e:
        logger.error(f"Role check failed: {e}")
        return {"role": "employee"}


# ── NEW: OTP endpoints ─────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(body: OtpRequest):
    """Generate and send a 6-digit OTP to the given email via Gmail SMTP."""
    try:
        db = firestore.Client()
        otp_code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        db.collection("otp_store").document(body.email).set({
            "otp": otp_code,
            "expires_at": expires_at,
            "verified": False,
        })

        message = MessageSchema(
            subject="Your AI Chief of Staff verification code",
            recipients=[body.email],
            body=f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color: #1a73e8;">AI Chief of Staff</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 10px; font-size: 36px; color: #333;
                     background: #f5f5f5; padding: 16px; border-radius: 8px;
                     text-align: center;">{otp_code}</h1>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">
            If you did not request this code, please ignore this email.
          </p>
        </div>
        """,
            subtype="html",
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info(f"✅ OTP email sent to {body.email}")

        return {"message": "OTP sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"send-otp failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email")


@router.post("/verify-otp")
async def verify_otp(body: OtpVerifyRequest):
    """Verify the OTP for the given email."""
    try:
        db = firestore.Client()
        doc_ref = db.collection("otp_store").document(body.email)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new code.")

        data = doc.to_dict()
        now = datetime.now(timezone.utc)

        # Check expiry
        expires_at = data.get("expires_at")
        if expires_at:
            if hasattr(expires_at, "tzinfo") and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if now > expires_at:
                doc_ref.delete()
                raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

        # Check already used
        if data.get("verified"):
            raise HTTPException(status_code=400, detail="OTP already used. Please request a new code.")

        # Check match
        if data.get("otp") != body.otp:
            raise HTTPException(status_code=400, detail="Incorrect verification code.")

        # Mark as verified (but don't delete yet – register endpoint needs it)
        doc_ref.update({"verified": True})
        return {"verified": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"verify-otp failed: {e}")
        raise HTTPException(status_code=500, detail="OTP verification error")


# ── NEW: Full registration endpoint ───────────────────────────────────────────

@router.post("/register")
async def register(
    company_name: str = Form(...),
    industry: str = Form(...),
    company_size: str = Form(...),
    website: Optional[str] = Form(default=""),
    founder_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    logo: UploadFile = File(...),
):
    """
    Full company + admin registration.
    1. Re-verify OTP is verified in Firestore (security check)
    2. Generate URL-safe company_id
    3. Upload logo to Firebase Storage
    4. Create Firebase Auth user
    5. Set custom claims (role=admin, company_id)
    6. Create companies/{company_id} Firestore document
    7. Create companies/{company_id}/employees/{uid} Firestore document
    8. Delete OTP from otp_store
    """
    try:
        db = firestore.Client()

        # ── 1. Security: confirm OTP was verified ──────────────────────────────
        otp_doc = db.collection("otp_store").document(email).get()
        if not otp_doc.exists or not otp_doc.to_dict().get("verified"):
            raise HTTPException(status_code=403, detail="Email not verified. Please complete OTP verification first.")

        # ── 2. Generate company_id ─────────────────────────────────────────────
        company_id = generate_company_id(company_name)

        # Ensure uniqueness (very rare collision, but guard anyway)
        while db.collection("companies").document(company_id).get().exists:
            company_id = generate_company_id(company_name)

        # ── 3. Upload logo to Firebase Storage ────────────────────────────────
        bucket_name = os.getenv("GCS_BUCKET_NAME", "ai-chief-of-staff-policies")
        logo_bytes = await logo.read()

        # Limit to 5 MB
        if len(logo_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Logo file must be under 5MB.")

        bucket = firebase_storage.bucket(bucket_name)
        blob_path = f"companies/{company_id}/logo.png"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(logo_bytes, content_type=logo.content_type or "image/png")
        blob.make_public()
        logo_url = blob.public_url

        # ── 4. Create Firebase Auth user ──────────────────────────────────────
        try:
            firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=founder_name,
            )
            uid = firebase_user.uid
        except firebase_auth.EmailAlreadyExistsError:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        # ── 5. Set custom claims ───────────────────────────────────────────────
        firebase_auth.set_custom_user_claims(uid, {
            "role": "admin",
            "company_id": company_id,
        })
        logger.info(f"✅ Custom claims set for {email} (admin, {company_id})")

        # ── 6. Create company Firestore document ──────────────────────────────
        now_utc = datetime.now(timezone.utc)
        trial_ends_at = now_utc + timedelta(days=5)

        db.collection("companies").document(company_id).set({
            "name": company_name,
            "industry": industry,
            "company_size": company_size,
            "website": website or "",
            "logo_url": logo_url,
            "plan": "trial",
            "trial_ends_at": trial_ends_at,
            "created_at": firestore.SERVER_TIMESTAMP,
            "owner_uid": uid,
            "owner_email": email,
            "admin_email": email,  # kept for legacy role-check endpoint
        })

        # ── 7. Create employee document for the admin ─────────────────────────
        db.collection("companies").document(company_id).collection("employees").document(uid).set({
            "employee_id": uid,
            "name": founder_name,
            "email": email,
            "role": "admin",
            "department": "Management",
            "joined_at": firestore.SERVER_TIMESTAMP,
            "performance_points": 0,
            "leave_balance": {
                "annual": 20,
                "sick": 10,
                "casual": 5,
            },
        })

        # ── 8. Delete OTP from otp_store ──────────────────────────────────────
        db.collection("otp_store").document(email).delete()

        return {
            "success": True,
            "company_id": company_id,
            "trial_ends_at": trial_ends_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# ── Trial status helper ────────────────────────────────────────────────────────

async def check_trial_status(company_id: str) -> dict:
    """
    Check the trial/plan status for a given company.
    Returns:
      { "active": True, "days_left": int }  — for active trial
      { "active": False, "reason": "trial_expired" }  — for expired trial
      { "active": True }  — for paid plan
    Do NOT enforce as middleware yet — call explicitly when needed.
    """
    try:
        db = firestore.Client()
        doc = db.collection("companies").document(company_id).get()
        if not doc.exists:
            return {"active": False, "reason": "company_not_found"}

        data = doc.to_dict()
        plan = data.get("plan", "trial")
        now = datetime.now(timezone.utc)

        if plan == "paid":
            return {"active": True}

        trial_ends_at = data.get("trial_ends_at")
        if trial_ends_at:
            if hasattr(trial_ends_at, "tzinfo") and trial_ends_at.tzinfo is None:
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
            if now > trial_ends_at:
                return {"active": False, "reason": "trial_expired"}
            days_left = max(0, (trial_ends_at - now).days)
            return {"active": True, "days_left": days_left}

        return {"active": True, "days_left": 0}
    except Exception as e:
        logger.error(f"check_trial_status failed: {e}")
        return {"active": False, "reason": "error"}
