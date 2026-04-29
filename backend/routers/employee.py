import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from google.cloud import firestore
from models.employee import EmployeeResponse, LeaveResponse
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db() -> firestore.Client:
    return firestore.Client()


@router.get("/{company_id}/{employee_id}", response_model=EmployeeResponse)
async def get_employee_profile(company_id: str, employee_id: str):
    """Return the full profile of an employee."""
    try:
        db = get_db()
        doc = db.collection(f"companies/{company_id}/employees").document(employee_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found.")
        data = doc.to_dict() or {}
        data["employee_id"] = doc.id
        data.setdefault("performance_points", 0)
        return EmployeeResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get employee profile failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch employee profile.")


@router.get("/{company_id}/{employee_id}/leave-balance")
async def get_leave_balance(company_id: str, employee_id: str) -> Dict[str, Any]:
    """Return the leave balance of an employee."""
    try:
        db = get_db()
        doc = db.collection(f"companies/{company_id}/employees").document(employee_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found.")
        data = doc.to_dict() or {}
        return data.get("leave_balance", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get leave balance failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leave balance.")


@router.get("/{company_id}/{employee_id}/points")
async def get_performance_points(company_id: str, employee_id: str) -> Dict[str, Any]:
    """Return total performance points for an employee."""
    try:
        db = get_db()
        doc = db.collection(f"companies/{company_id}/employees").document(employee_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found.")
        data = doc.to_dict() or {}
        return {"employee_id": employee_id, "performance_points": data.get("performance_points", 0)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get performance points failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance points.")


@router.get("/{company_id}/{employee_id}/leaves")
async def get_leave_history(company_id: str, employee_id: str) -> List[Dict[str, Any]]:
    """Return all leave requests for an employee."""
    try:
        db = get_db()
        docs = db.collection(f"companies/{company_id}/leave_requests").where(
            filter=firestore.FieldFilter("employee_id", "==", employee_id)
        ).stream()
        return [{"request_id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Get leave history failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leave history.")
