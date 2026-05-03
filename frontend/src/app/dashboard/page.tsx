'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { adminService, LeaveRequest } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import { Employee, Project } from '../../types';
import toast from 'react-hot-toast';
import { Users, FolderKanban, TrendingUp, CalendarOff, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavesLoading, setLeavesLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingLeaves();
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

  const fetchPendingLeaves = async () => {
    if (!user?.companyId) return;
    try {
      setLeavesLoading(true);
      const data = await adminService.getPendingLeaves(user.companyId);
      setPendingLeaves(data || []);
    } catch {
      // Non-blocking
    } finally {
      setLeavesLoading(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    if (!user?.companyId) return;
    try {
      await adminService.approveLeave(user.companyId, leaveId);
      toast.success('Leave approved');
      fetchPendingLeaves();
    } catch {
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async (leaveId: string) => {
    if (!user?.companyId) return;
    try {
      await adminService.rejectLeave(user.companyId, leaveId);
      toast.success('Leave rejected');
      fetchPendingLeaves();
    } catch {
      toast.error('Failed to reject leave');
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

      {/* Pending Leave Requests */}
      <Card className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Pending Leave Requests</h3>
            {pendingLeaves.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-orange-200">
                {pendingLeaves.length} pending
              </span>
            )}
          </div>
        </div>

        {leavesLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : pendingLeaves.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No pending leave requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Employee</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Type</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Days</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">Reason</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingLeaves.map(req => (
                  <tr key={req.leave_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {req.employee_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{req.employee_name || req.employee_id}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        req.leave_type === 'annual'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        req.leave_type === 'sick'    ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                       'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {req.leave_type}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-gray-700">{req.days}</span>
                      <span className="text-gray-400 ml-1">day{req.days !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="py-3 pr-4 max-w-xs">
                      <p className="text-gray-500 truncate">{req.reason || '—'}</p>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(req.leave_id)}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.leave_id)}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
