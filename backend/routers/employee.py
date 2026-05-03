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


@router.post("/{company_id}/{employee_id}/leaves/apply")
async def apply_leave(
    company_id: str,
    employee_id: str,
    leave_type: str,
    days: int,
    reason: str = "",
) -> Dict[str, Any]:
    """
    Submits a leave request with status 'pending'. Balance is deducted only on admin approval.
    leave_type must be: annual | casual | sick
    """
    valid_types = {"annual", "casual", "sick"}
    if leave_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid leave_type. Must be one of: annual, casual, sick"
        )
    if days <= 0:
        raise HTTPException(status_code=400, detail="days must be greater than 0")

    try:
        db = get_db()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        data = doc.to_dict() or {}
        balance = data.get("leave_balance", {"annual": 20, "casual": 5, "sick": 10})
        current = balance.get(leave_type, 0)

        if current < days:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {leave_type} leave. Available: {current}, Requested: {days}"
            )

        # Save pending leave request — balance deducted only on admin approval
        db.collection(f"companies/{company_id}/leave_requests").add({
            "employee_id": employee_id,
            "employee_name": data.get("name", ""),
            "leave_type": leave_type,
            "days": days,
            "reason": reason,
            "status": "pending",
            "applied_at": firestore.SERVER_TIMESTAMP,
        })

        return {
            "message": f"Leave request for {days} day(s) of {leave_type} leave submitted. Pending admin approval.",
            "current_balance": balance,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"apply_leave error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}/{employee_id}/tasks")
async def get_tasks(company_id: str, employee_id: str) -> Dict[str, Any]:
    """
    Fetches tasks from companies/{company_id}/employees/{employee_id}/tasks sub-collection.
    Returns tasks list + open_count for the sidebar badge.
    """
    try:
        db = get_db()
        tasks_ref = db.collection(
            f"companies/{company_id}/employees/{employee_id}/tasks"
        )
        docs = list(tasks_ref.stream())
        tasks = []
        for doc in docs:
            d = doc.to_dict() or {}
            d["task_id"] = doc.id
            tasks.append(d)

        open_count = len([t for t in tasks if t.get("status", "open") == "open"])

        return {
            "tasks": tasks,
            "open_count": open_count,
            "total_count": len(tasks),
        }
    except Exception as e:
        logger.error(f"get_tasks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{company_id}/{employee_id}/tasks/{task_id}")
async def update_task_status(
    company_id: str,
    employee_id: str,
    task_id: str,
    status: str,
) -> Dict[str, Any]:
    """Update task status. Valid values: open, in_progress, done"""
    valid = {"open", "in_progress", "done"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: open, in_progress, done")
    try:
        db = get_db()
        task_ref = db.collection(
            f"companies/{company_id}/employees/{employee_id}/tasks"
        ).document(task_id)
        if not task_ref.get().exists:
            raise HTTPException(status_code=404, detail="Task not found")
        task_ref.update({"status": status})
        return {"message": f"Task status updated to {status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_task_status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{company_id}/{employee_id}/tasks/{task_id}/suggest-points")
async def suggest_points(company_id: str, employee_id: str, task_id: str) -> Dict[str, Any]:
    """AI suggests performance points based on task complexity."""
    try:
        db = get_db()
        task_ref = db.collection(
            f"companies/{company_id}/employees/{employee_id}/tasks"
        ).document(task_id)
        task = task_ref.get().to_dict()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        priority = task.get("priority", "medium").lower()
        estimated_hours = task.get("estimated_hours") or 0

        base_points = {"low": 10, "medium": 25, "high": 50}.get(priority, 25)
        hour_bonus = min(int(estimated_hours) * 2, 30)
        suggested_points = base_points + hour_bonus

        reason = f"{priority.title()} priority task"
        if estimated_hours:
            reason += f" + {estimated_hours}h estimated effort"

        return {"suggested_points": suggested_points, "reason": reason}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"suggest_points error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
