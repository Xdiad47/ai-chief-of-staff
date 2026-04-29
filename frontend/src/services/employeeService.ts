import api from './api';
import { Employee, LeaveBalance, LeaveRecord } from '../types';

export const employeeService = {
  getProfile: async (companyId: string, employeeId: string): Promise<Employee> => {
    const res = await api.get(`/api/employee/${companyId}/${employeeId}`);
    return res.data;
  },
  getLeaveBalance: async (companyId: string, employeeId: string): Promise<LeaveBalance> => {
    const res = await api.get(`/api/employee/${companyId}/${employeeId}/leave-balance`);
    return res.data;
  },
  getPoints: async (companyId: string, employeeId: string): Promise<{ employee_id: string, performance_points: number }> => {
    const res = await api.get(`/api/employee/${companyId}/${employeeId}/points`);
    return res.data;
  },
  getLeaveHistory: async (companyId: string, employeeId: string): Promise<LeaveRecord[]> => {
    const res = await api.get(`/api/employee/${companyId}/${employeeId}/leaves`);
    return res.data;
  }
};
