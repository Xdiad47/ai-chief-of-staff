import api from './api';
import { Employee, Project } from '../types';

export const adminService = {
  getEmployees: async (companyId: string): Promise<Employee[]> => {
    const res = await api.get(`/api/admin/employees/${companyId}`);
    return res.data;
  },
  addEmployee: async (data: Record<string, unknown>) => {
    const res = await api.post('/api/admin/add-employee', data);
    return res.data;
  },
  getProjects: async (companyId: string): Promise<Project[]> => {
    const res = await api.get(`/api/admin/projects/${companyId}`);
    return res.data;
  },
  addProject: async (data: Record<string, unknown>) => {
    const res = await api.post('/api/admin/add-project', data);
    return res.data;
  },
  awardPoints: async (companyId: string, employeeId: string, points: number) => {
    const res = await api.post(
      `/api/admin/employees/${companyId}/${employeeId}/award-points`,
      null,
      { params: { points } }
    );
    return res.data;
  },
  deleteEmployee: async (companyId: string, employeeId: string) => {
    const res = await api.delete(`/api/admin/employees/${companyId}/${employeeId}`);
    return res.data;
  },
  uploadPolicy: async (companyId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);
    const res = await api.post('/api/admin/upload-policy', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  getTeamTasks: async (companyId: string): Promise<TeamTask[]> => {
    const res = await api.get(`/api/admin/${companyId}/team-tasks`);
    return res.data;
  },
  getPendingLeaves: async (companyId: string) => {
    const res = await api.get(`/api/admin/${companyId}/pending-leaves`);
    return res.data as LeaveRequest[];
  },
  approveLeave: async (companyId: string, leaveId: string) => {
    const res = await api.patch(`/api/admin/${companyId}/leaves/${leaveId}/approve`);
    return res.data;
  },
  rejectLeave: async (companyId: string, leaveId: string) => {
    const res = await api.patch(`/api/admin/${companyId}/leaves/${leaveId}/reject`);
    return res.data;
  },
};

export interface TeamTask {
  task_id: string;
  employee_id: string;
  employee_name: string;
  employee_points: number;
  project_id?: string;
  project_name?: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
}

export interface LeaveRequest {
  leave_id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  days: number;
  reason: string;
  status: string;
  applied_at?: string;
}
