import logging
import os
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from google.adk.tools import FunctionTool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_firestore_client() -> firestore.Client:
    """Get Firestore client using Application Default Credentials."""
    return firestore.Client()

def get_employee(company_id: str, employee_id: str) -> Dict[str, Any]:
    """Get employee details."""
    try:
        db = get_firestore_client()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict() or {}
        return {}
    except Exception as e:
        logger.error(f"Error fetching employee: {e}")
        return {}

def get_leave_balance(company_id: str, employee_id: str) -> Dict[str, Any]:
    """Get leave balance for an employee."""
    try:
        employee = get_employee(company_id, employee_id)
        return employee.get("leave_balance", {})
    except Exception as e:
        logger.error(f"Error fetching leave balance: {e}")
        return {}

def update_leave_balance(company_id: str, employee_id: str, leave_type: str, days: int) -> bool:
    """Update leave balance for an employee."""
    try:
        db = get_firestore_client()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            current_balance = data.get("leave_balance", {})
            current_days = current_balance.get(leave_type, 0)
            
            doc_ref.update({
                f"leave_balance.{leave_type}": current_days + days
            })
            return True
        return False
    except Exception as e:
        logger.error(f"Error updating leave balance: {e}")
        return False

def create_leave_request(company_id: str, data: Dict[str, Any]) -> str:
    """Create a new leave request."""
    try:
        db = get_firestore_client()
        _, doc_ref = db.collection(f"companies/{company_id}/leave_requests").add(data)
        return doc_ref.id
    except Exception as e:
        logger.error(f"Error creating leave request: {e}")
        return ""

def get_leave_requests(company_id: str, employee_id: str) -> List[Dict[str, Any]]:
    """Get leave requests for an employee."""
    try:
        db = get_firestore_client()
        docs = db.collection(f"companies/{company_id}/leave_requests").where(
            filter=firestore.FieldFilter("employee_id", "==", employee_id)
        ).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching leave requests: {e}")
        return []

def award_performance_points(company_id: str, employee_id: str, points: int, reason: str) -> bool:
    """Award performance points to an employee."""
    try:
        db = get_firestore_client()
        doc_ref = db.collection(f"companies/{company_id}/employees").document(employee_id)
        
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            current_points = data.get("performance_points", 0)
            doc_ref.update({
                "performance_points": current_points + points
            })
            
            # Record the reason
            db.collection(f"companies/{company_id}/employees/{employee_id}/performance_logs").add({
                "points": points,
                "reason": reason,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            return True
        return False
    except Exception as e:
        logger.error(f"Error awarding performance points: {e}")
        return False

def get_employee_points(company_id: str, employee_id: str) -> int:
    """Get total performance points of an employee."""
    try:
        employee = get_employee(company_id, employee_id)
        return employee.get("performance_points", 0)
    except Exception as e:
        logger.error(f"Error fetching employee points: {e}")
        return 0

def get_projects(company_id: str) -> List[Dict[str, Any]]:
    """Get all projects for a company."""
    try:
        db = get_firestore_client()
        docs = db.collection(f"companies/{company_id}/projects").stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        return []

# Wrap as FunctionTool
get_employee_tool = FunctionTool(get_employee)
get_leave_balance_tool = FunctionTool(get_leave_balance)
update_leave_balance_tool = FunctionTool(update_leave_balance)
create_leave_request_tool = FunctionTool(create_leave_request)
get_leave_requests_tool = FunctionTool(get_leave_requests)
award_performance_points_tool = FunctionTool(award_performance_points)
get_employee_points_tool = FunctionTool(get_employee_points)
get_projects_tool = FunctionTool(get_projects)

all_tools = [
    get_employee_tool,
    get_leave_balance_tool,
    update_leave_balance_tool,
    create_leave_request_tool,
    get_leave_requests_tool,
    award_performance_points_tool,
    get_employee_points_tool,
    get_projects_tool
]
