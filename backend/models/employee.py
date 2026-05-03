from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class EmployeeCreate(BaseModel):
    company_id: str
    name: str
    email: EmailStr
    password: Optional[str] = None
    role: Optional[str] = "employee"
    department: Optional[str] = None
    position: Optional[str] = None
    leave_balance: Optional[Dict[str, int]] = None

class EmployeeResponse(BaseModel):
    employee_id: str
    company_id: str
    name: str
    email: str
    role: Optional[str] = "employee"
    department: Optional[str] = None
    position: Optional[str] = None
    performance_points: Optional[int] = 0
    uid: Optional[str] = None
    leave_balance: Optional[Dict[str, int]] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    performance_points: Optional[int] = None


class LeaveRequest(BaseModel):
    employee_id: str
    company_id: str
    leave_type: str = Field(..., description="e.g. annual, sick, casual")
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    reason: str


class LeaveResponse(LeaveRequest):
    request_id: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectModel(BaseModel):
    project_id: Optional[str] = None
    company_id: str
    name: str
    description: str
    status: str = Field(..., description="e.g. active, completed, on_hold")
    priority: str = Field(..., description="HIGH, MEDIUM, or LOW")
    deadline: str = Field(..., description="YYYY-MM-DD")
    assigned_employees: List[str] = []


class PerformanceLog(BaseModel):
    employee_id: str
    company_id: str
    points: int
    reason: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(BaseModel):
    employee_id: str
    company_id: str
    message: str
    role: str = Field(default="user", description="user or assistant")


class ChatResponse(BaseModel):
    reply: str
    agent_used: str = "orchestrator"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CompanyUpload(BaseModel):
    company_id: str
    filename: str
    file_type: str = "application/pdf"
