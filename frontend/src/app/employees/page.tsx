'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import { Employee } from '../../types';
import toast from 'react-hot-toast';
import { Search, Plus, Users } from 'lucide-react';

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'employee', department: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEmployees(user!.companyId);
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.department) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setSaving(true);
      await adminService.addEmployee({
        ...formData,
        company_id: user!.companyId
      });
      toast.success('Employee added successfully!');
      setShowForm(false);
      setFormData({ name: '', email: '', role: 'employee', department: '', password: '' });
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Employees" subtitle="Manage your team members and their roles.">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 border-brand-200 shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Employee</h3>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <Input label="Email Address" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Input label="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required />
            <Input label="Temporary Password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={6} />
            
            <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Save Employee</Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState 
            icon={<Users className="w-12 h-12 text-gray-400" />}
            title="No employees found"
            description={search ? "Try adjusting your search query." : "Get started by adding your first employee."}
            action={!search ? { label: "Add Employee", onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={emp.role === 'admin' ? 'purple' : emp.role === 'manager' ? 'blue' : 'gray'}>
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.leave_balance?.annual || 0}A / {emp.leave_balance?.sick || 0}S / {emp.leave_balance?.casual || 0}C
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2 font-medium">{emp.performance_points || 0} pts</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-brand-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(((emp.performance_points || 0) / 100) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
