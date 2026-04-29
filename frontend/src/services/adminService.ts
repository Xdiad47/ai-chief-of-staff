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
  }
};
