import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List
from google.cloud import firestore
from models.employee import EmployeeCreate, EmployeeResponse, ProjectModel
from tools.storage_tool import upload_policy_pdf
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db() -> firestore.Client:
    return firestore.Client()


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

        # Save metadata to Firestore
        db = get_db()
        db.collection(f"companies/{company_id}/policies").add({
            "filename": file.filename,
            "file_type": file.content_type,
            "signed_url": signed_url,
        })

        return {"filename": file.filename, "signed_url": signed_url, "message": "Policy uploaded successfully."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Policy upload failed: {e}")
        raise HTTPException(status_code=500, detail="Policy upload failed.")


# ── Employee Management ───────────────────────────────────────────────────────

@router.post("/add-employee", response_model=EmployeeResponse)
async def add_employee(body: EmployeeCreate):
    """Create a new employee record under the given company."""
    try:
        db = get_db()
        data = body.model_dump()
        data["performance_points"] = 0

        _, doc_ref = db.collection(f"companies/{body.company_id}/employees").add(data)

        return EmployeeResponse(employee_id=doc_ref.id, **data)
    except Exception as e:
        logger.error(f"Add employee failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to add employee.")


@router.get("/employees/{company_id}", response_model=List[EmployeeResponse])
async def get_employees(company_id: str):
    """Return all employees for a company."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/employees").stream()
        results = []
        for doc in docs:
            data = doc.to_dict() or {}
            data["employee_id"] = doc.id
            data.setdefault("performance_points", 0)
            results.append(EmployeeResponse(**data))
        return results
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
