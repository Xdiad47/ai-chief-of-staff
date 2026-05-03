export interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'employee';
  companyId: string;
  employeeId: string;
  displayName?: string;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  casual: number;
}

export interface Employee {
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  company_id: string;
  leave_balance: LeaveBalance;
  performance_points: number;
}

export interface Project {
  project_id: string;
  company_id: string;
  name: string;
  description: string;
  department?: string;
  status: string;
  priority: string;
  deadline: string;
  assigned_employees: string[];
}

export interface LeaveRecord {
  request_id: string;
  employee_id: string;
  company_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}
