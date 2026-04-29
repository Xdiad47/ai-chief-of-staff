'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import { Employee, Project } from '../../types';
import toast from 'react-hot-toast';
import { Users, FolderKanban, TrendingUp, CalendarOff } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch even if companyId is empty — show empty state gracefully
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const companyId = user.companyId || '';
      
      if (!companyId) {
        console.warn('⚠️ No companyId found for user');
        setEmployees([]);
        setProjects([]);
        return;
      }

      const [empData, projData] = await Promise.all([
        adminService.getEmployees(companyId),
        adminService.getProjects(companyId)
      ]);
      setEmployees(empData || []);
      setProjects(projData || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  const activeProjects = projects.filter(p => p.status.toLowerCase() === 'active').length;
  const avgPoints = employees.length > 0 
    ? Math.round(employees.reduce((acc, emp) => acc + (emp.performance_points || 0), 0) / employees.length) 
    : 0;
  
  const teamOnLeave = employees.filter(emp => {
    const total = (emp.leave_balance?.annual || 0) + (emp.leave_balance?.sick || 0) + (emp.leave_balance?.casual || 0);
    return total < 5;
  }).length;

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Projects', value: activeProjects, icon: FolderKanban, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Avg Performance', value: avgPoints, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Team on Leave', value: teamOnLeave, icon: CalendarOff, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your organization's performance">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="flex items-center p-6">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} mr-4`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Employees</h3>
          </div>
          <div className="space-y-4">
            {employees.slice(-5).reverse().map(emp => (
              <div key={emp.employee_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </div>
                </div>
                <Badge variant={emp.role === 'admin' ? 'purple' : 'blue'}>
                  {emp.role}
                </Badge>
              </div>
            ))}
            {employees.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No employees found.</p>}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Projects Overview</h3>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 5).map(proj => (
              <div key={proj.project_id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{proj.name}</p>
                  <p className="text-xs text-gray-500">Deadline: {proj.deadline}</p>
                </div>
                <Badge variant={
                  proj.status.toLowerCase() === 'active' ? 'green' : 
                  proj.status.toLowerCase() === 'completed' ? 'gray' : 'yellow'
                }>
                  {proj.status}
                </Badge>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No projects found.</p>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
