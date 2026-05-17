import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from typing import List, Optional
from google.cloud import firestore
from firebase_admin import auth as firebase_auth
from models.employee import EmployeeCreate, EmployeeResponse, ProjectModel
from tools.storage_tool import upload_policy_pdf
from services.reminder_service import run_task_reminders_for_company
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db() -> firestore.Client:
    return firestore.Client()


def _parse_due_date(raw_due_date: object) -> Optional[date]:
    """Parse task due date values from Firestore to a date, if possible."""
    if not raw_due_date:
        return None

    if isinstance(raw_due_date, datetime):
        return raw_due_date.date()
    if isinstance(raw_due_date, date):
        return raw_due_date
    if isinstance(raw_due_date, str):
        text = raw_due_date.strip()
        if not text:
            return None

        # Common UI value from <input type=\"date\">: YYYY-MM-DD
        try:
            return date.fromisoformat(text)
        except ValueError:
            pass

        # Fallback for timestamp-like strings
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
        except ValueError:
            return None
    return None


# ── Policy Upload ─────────────────────────────────────────────────────────────

@router.post("/upload-policy")
async def upload_policy(
    company_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a policy PDF to GCS and store its metadata in Firestore."""
    try:
        if file.content_type not in ("application/pdf", "text/plain"):
            raise HTTPException(status_code=415, detail="Only PDF or text files are supported.")

        file_bytes = await file.read()
        signed_url = upload_policy_pdf(company_id, file_bytes, file.filename)

        if not signed_url:
            raise HTTPException(status_code=500, detail="Failed to upload file to storage.")

        # Save metadata to Firestore — gcs_path is permanent (no expiry)
        db = get_db()
        db.collection(f"companies/{company_id}/policies").add({
            "filename": file.filename,
            "file_type": file.content_type,
            "signed_url": signed_url,
            "gcs_path": f"{company_id}/{file.filename}",
            "uploaded_at": firestore.SERVER_TIMESTAMP,
        })

        return {"filename": file.filename, "signed_url": signed_url, "message": "Policy uploaded successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Policy upload failed: {e}")
        raise HTTPException(status_code=500, detail="Policy upload failed.")


@router.get("/policies/{company_id}")
async def list_policies(company_id: str):
    """Return all uploaded policy documents for a company."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/policies").stream()
        results = []
        for doc in docs:
            d = doc.to_dict() or {}
            d["policy_id"] = doc.id
            # Convert Firestore timestamp to ISO string if present
            if "uploaded_at" in d and hasattr(d["uploaded_at"], "isoformat"):
                d["uploaded_at"] = d["uploaded_at"].isoformat()
            results.append(d)
        # Sort newest first
        results.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
        return results
    except Exception as e:
        logger.error(f"list_policies error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch policies.")


# ── Employee Management ───────────────────────────────────────────────────────

@router.post("/add-employee", response_model=EmployeeResponse)
async def add_employee(body: EmployeeCreate):
    """Create a new employee in Firestore AND Firebase Auth."""
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth, credentials
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
        db = get_db()
        data = body.model_dump()
        data.pop("password", None)
        data["performance_points"] = 0
        data["leave_balance"] = data.get("leave_balance") or {"annual": 20, "casual": 5, "sick": 10}
        # Create Firestore record FIRST to get the document ID
        _, doc_ref = db.collection(f"companies/{body.company_id}/employees").add(data)
        # Create Firebase Auth user
        try:
            firebase_user = firebase_auth.create_user(
                email=body.email,
                password=body.password,
                display_name=body.name,
            )
            # Set custom claims INCLUDING employee_id
            firebase_auth.set_custom_user_claims(firebase_user.uid, {
                "role": body.role or "employee",
                "company_id": body.company_id,
                "employee_id": doc_ref.id
            })
            # Update the Firestore doc with the Firebase uid
            doc_ref.update({"uid": firebase_user.uid})
            data["uid"] = firebase_user.uid
            logger.info(f"✅ Firebase Auth user created: {body.email}")
        except Exception as auth_error:
            logger.warning(f"⚠️ Firebase Auth user creation failed: {auth_error}")
        return EmployeeResponse(employee_id=doc_ref.id, **data)
    except Exception as e:
        logger.error(f"Add employee failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to add employee.")


@router.get("/company/{company_id}")
async def get_company_info(company_id: str):
    """Return company name and logo URL."""
    try:
        db = get_db()
        doc = db.collection("companies").document(company_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Company not found.")
        data = doc.to_dict()
        return {"name": data.get("name", ""), "logo_url": data.get("logo_url", "")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get company info failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch company info.")


@router.get("/employees/{company_id}", response_model=List[EmployeeResponse])
async def get_employees(company_id: str):
    """Return all employees for a company."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/employees").stream()
        employees = []
        for doc in docs:
            try:
                data = doc.to_dict() or {}
                data["employee_id"] = doc.id
                # Fill any missing optional fields with defaults
                data.setdefault("role", "employee")
                data.setdefault("department", None)
                data.setdefault("position", None)
                data.setdefault("performance_points", 0)
                data.setdefault("uid", None)
                employees.append(EmployeeResponse(**data))
            except Exception as e:
                logger.warning(f"Skipping malformed employee doc {doc.id}: {e}")
                continue
        return employees
    except Exception as e:
        logger.error(f"Get employees failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch employees.")


# ── Project Management ────────────────────────────────────────────────────────

@router.post("/add-project", response_model=ProjectModel)
async def add_project(body: ProjectModel):
    """Add a new project to Firestore."""
    try:
        db = get_db()
        data = body.model_dump(exclude={"project_id"})
        _, doc_ref = db.collection(f"companies/{body.company_id}/projects").add(data)
        return ProjectModel(project_id=doc_ref.id, **data)
    except Exception as e:
        logger.error(f"Add project failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to add project.")


@router.get("/projects/{company_id}", response_model=List[ProjectModel])
async def get_projects(company_id: str):
    """Return all projects for a company."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/projects").stream()
        results = []
        for doc in docs:
            data = doc.to_dict() or {}
            data["project_id"] = doc.id
            results.append(ProjectModel(**data))
        return results
    except Exception as e:
        logger.error(f"Get projects failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects.")


@router.delete("/employees/{company_id}/{employee_id}")
async def delete_employee(company_id: str, employee_id: str):
    """Delete employee from both Firestore AND Firebase Auth."""
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth, credentials
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

        db = get_db()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        uid = doc.to_dict().get("uid")
        if uid:
            try:
                firebase_auth.delete_user(uid)
                logger.info(f"Firebase Auth user {uid} deleted")
            except firebase_auth.UserNotFoundError:
                logger.warning(f"Firebase user {uid} already deleted — skipping")

        doc_ref.delete()
        return {"message": f"Employee {employee_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_employee error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employees/{company_id}/{employee_id}/award-points")
async def award_points(company_id: str, employee_id: str, points: int):
    """Add performance points to an employee. Adds on top of existing total."""
    try:
        db = get_db()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")
        current = doc.to_dict().get("performance_points", 0)
        new_total = current + points
        doc_ref.update({"performance_points": new_total})
        return {"message": f"Awarded {points} points", "total_points": new_total}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"award_points error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/employees/{company_id}/{employee_id}/points")
async def award_points_v2(company_id: str, employee_id: str, request: Request):
    """Increment performance points and record a history entry with reason."""
    try:
        body = await request.json()
        points = body.get("points")
        reason = (body.get("reason") or "").strip()

        if not isinstance(points, int) or points < 1 or points > 100:
            raise HTTPException(status_code=400, detail="Points must be between 1 and 100")
        if not reason:
            raise HTTPException(status_code=400, detail="Reason is required")

        db = get_db()
        emp_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        doc = emp_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        current = doc.to_dict().get("performance_points", 0)
        new_total = current + points
        emp_ref.update({"performance_points": new_total})

        emp_ref.collection("points_history").add({
            "points": points,
            "reason": reason,
            "awarded_at": firestore.SERVER_TIMESTAMP,
        })

        return {"message": f"Awarded {points} points", "total_points": new_total}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"award_points_v2 error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/{company_id}")
async def get_analytics(company_id: str):
    """Returns total employees, department breakdown, and average performance points."""
    try:
        db = get_db()
        docs = list(db.collection(f"companies/{company_id}/employees").stream())
        total = len(docs)
        dept_counts: dict = {}
        total_points = 0
        for doc in docs:
            d = doc.to_dict()
            dept = d.get("department") or "Unassigned"
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            total_points += d.get("performance_points", 0)
        return {
            "total_employees": total,
            "departments": dept_counts,
            "average_performance_points": round(total_points / total, 1) if total else 0,
        }
    except Exception as e:
        logger.error(f"get_analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Task Assignment ───────────────────────────────────────────────────────────

@router.post("/employees/{company_id}/{employee_id}/tasks")
async def assign_task(company_id: str, employee_id: str, request: Request):
    """Admin assigns a task to an employee."""
    try:
        body = await request.json()
        title = body.get("title", "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="title is required")

        db = get_db()
        emp_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        if not emp_ref.get().exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        task = {
            "title": title,
            "description": body.get("description", ""),
            "priority": body.get("priority", "medium"),
            "due_date": body.get("due_date", ""),
            "project_id": body.get("project_id", ""),
            "estimated_hours": body.get("estimated_hours", None),
            "status": "open",
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        _, task_ref = emp_ref.collection("tasks").add(task)
        return {"message": "Task assigned successfully", "task_id": task_ref.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"assign_task error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employees/{company_id}/{employee_id}/tasks")
async def get_employee_tasks(company_id: str, employee_id: str):
    """Return all tasks for a specific employee."""
    try:
        db = get_db()
        emp_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        if not emp_ref.get().exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        tasks = []
        for doc in emp_ref.collection("tasks").stream():
            t = doc.to_dict() or {}
            t["task_id"] = doc.id
            if "created_at" in t and hasattr(t["created_at"], "isoformat"):
                t["created_at"] = t["created_at"].isoformat()
            tasks.append(t)

        tasks.sort(key=lambda x: x.get("due_date", ""), reverse=False)
        return tasks
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_employee_tasks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Team Tasks ────────────────────────────────────────────────────────────────

@router.get("/{company_id}/team-tasks")
async def get_team_tasks(company_id: str):
    """Fetch all tasks across all employees, enriched with employee name, points, and project name."""
    try:
        db = get_db()

        # Build project_id → name lookup
        project_map: dict = {}
        for doc in db.collection(f"companies/{company_id}/projects").stream():
            project_map[doc.id] = (doc.to_dict() or {}).get("name", "")

        all_tasks = []
        for emp_doc in db.collection(f"companies/{company_id}/employees").stream():
            emp_data = emp_doc.to_dict() or {}
            emp_id = emp_doc.id
            emp_name = emp_data.get("name", "")
            emp_points = emp_data.get("performance_points", 0)

            for task_doc in emp_doc.reference.collection("tasks").stream():
                t = task_doc.to_dict() or {}
                project_id = t.get("project_id", "")
                t["task_id"] = task_doc.id
                t["employee_id"] = emp_id
                t["employee_name"] = emp_name
                t["employee_points"] = emp_points
                t["project_name"] = project_map.get(project_id, project_id or "")
                all_tasks.append(t)

        return all_tasks
    except Exception as e:
        logger.error(f"get_team_tasks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Leave Management ──────────────────────────────────────────────────────────

@router.get("/{company_id}/pending-leaves")
async def get_pending_leaves(company_id: str):
    """Return all pending leave requests for a company."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/leave_requests").where(
            filter=firestore.FieldFilter("status", "==", "pending")
        ).stream()
        results = []
        for doc in docs:
            d = doc.to_dict() or {}
            d["leave_id"] = doc.id
            results.append(d)
        return results
    except Exception as e:
        logger.error(f"get_pending_leaves error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{company_id}/leaves/{leave_id}/approve")
async def approve_leave(company_id: str, leave_id: str):
    """Approve a pending leave request and deduct the balance."""
    try:
        db = get_db()
        leave_ref = db.collection(f"companies/{company_id}/leave_requests").document(leave_id)
        leave_doc = leave_ref.get()
        if not leave_doc.exists:
            raise HTTPException(status_code=404, detail="Leave request not found")

        leave_data = leave_doc.to_dict() or {}
        if leave_data.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Leave request is not pending")

        employee_id = leave_data["employee_id"]
        leave_type = leave_data["leave_type"].lower()   # normalise case (agent may send "Casual")
        days = leave_data["days"]

        emp_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        emp_doc = emp_ref.get()
        if not emp_doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        emp_data = emp_doc.to_dict() or {}
        balance = emp_data.get("leave_balance", {"annual": 20, "casual": 5, "sick": 10})
        current = balance.get(leave_type, 0)

        if current < days:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {leave_type} leave. Available: {current}, Requested: {days}"
            )

        balance[leave_type] = current - days
        emp_ref.update({"leave_balance": balance})
        leave_ref.update({"status": "approved"})

        return {"message": "Leave approved", "updated_balance": balance}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"approve_leave error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{company_id}/leaves/{leave_id}/reject")
async def reject_leave(company_id: str, leave_id: str):
    """Reject a pending leave request (no balance change)."""
    try:
        db = get_db()
        leave_ref = db.collection(f"companies/{company_id}/leave_requests").document(leave_id)
        leave_doc = leave_ref.get()
        if not leave_doc.exists:
            raise HTTPException(status_code=404, detail="Leave request not found")

        leave_data = leave_doc.to_dict() or {}
        if leave_data.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Leave request is not pending")

        leave_ref.update({"status": "rejected"})
        return {"message": "Leave rejected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"reject_leave error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Task Reminders ────────────────────────────────────────────────────────────

@router.post("/{company_id}/tasks/send-overdue-reminders")
async def send_overdue_task_reminders(company_id: str):
    """
    Trigger the 3-phase smart task reminder for one company:
      T-1  → "due tomorrow" warning (sent once per task)
      T    → "due today" reminder (sent once per task)
      T+   → "overdue, bonus forfeited" final notice (sent once per task, permanent)

    Each phase is tracked by a boolean flag on the Firestore task document
    so it is never re-sent.
    """
    try:
        db = get_db()
        result = await run_task_reminders_for_company(company_id, db)
        if "skipped" in result:
            raise HTTPException(status_code=500, detail=result["skipped"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"send_overdue_task_reminders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
