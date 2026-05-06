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
import { Employee, Project } from '../../types';
import toast from 'react-hot-toast';
import { Search, Plus, Users, ClipboardList, X, Star, Trash2 } from 'lucide-react';

// ── Assign Task Modal ─────────────────────────────────────────────────────────

interface AssignTaskModalProps {
  employee: Employee;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignTaskModal({ employee, companyId, onClose, onSuccess }: AssignTaskModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    estimated_hours: '',
    due_date: '',
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getProjects(companyId)
      .then(data => setProjects(data || []))
      .catch(() => {});
  }, [companyId]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required'); return; }
    if (!form.due_date) { setError('Due date is required'); return; }
    setError('');

    try {
      setSaving(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${companyId}/${employee.employee_id}/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            due_date: form.due_date,
            status: 'open',
            ...(form.project_id && { project_id: form.project_id }),
            ...(form.estimated_hours !== '' && { estimated_hours: Number(form.estimated_hours) }),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to assign task');
      toast.success(`Task assigned to ${employee.name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Backdrop — click outside closes */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Assign Task</p>
              <p className="text-xs text-gray-500">{employee.name} · {employee.department || 'Employee'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Complete Q2 report"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add more context about this task..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Linked Project <span className="text-gray-400">(optional)</span>
            </label>
            <select
              value={form.project_id}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">— No project —</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                Est. Hours <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={form.estimated_hours}
                onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))}
                placeholder="e.g. 8"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Assign Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Award Points Modal ────────────────────────────────────────────────────────

interface AwardPointsModalProps {
  employee: Employee;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AwardPointsModal({ employee, companyId, onClose, onSuccess }: AwardPointsModalProps) {
  const [points, setPoints] = useState(10);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points < 1 || points > 100) { setError('Points must be between 1 and 100'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError('');

    try {
      setSaving(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${companyId}/${employee.employee_id}/points`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points, reason: reason.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to award points');
      toast.success(`+${points} points awarded to ${employee.name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Backdrop — click outside closes */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Award Points</p>
              <p className="text-xs text-gray-500">{employee.name} · {employee.performance_points || 0} pts current</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Points input + quick buttons */}
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
              Points to Award <span className="text-rose-500">*</span>
              <span className="text-gray-400 normal-case ml-1">(1–100)</span>
            </label>
            <div className="flex gap-2 mb-2">
              {[10, 25, 50].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setPoints(q)}
                  className={`flex-1 text-sm font-semibold py-1.5 rounded-lg border transition-all ${
                    points === q
                      ? 'bg-yellow-400 border-yellow-400 text-white'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  +{q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Completed sprint ahead of schedule"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>
              <Star className="w-4 h-4 mr-2" />
              Award {points} pts
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'employee', department: '', password: '' });
  const [saving, setSaving] = useState(false);

  // Assign task modal state
  const [taskTarget, setTaskTarget] = useState<Employee | null>(null);
  const [awardTarget, setAwardTarget] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      setDeletingId(emp.employee_id);
      await adminService.deleteEmployee(user!.companyId, emp.employee_id);
      setEmployees(prev => prev.filter(e => e.employee_id !== emp.employee_id));
      toast.success(`Employee deleted`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete employee');
    } finally {
      setDeletingId(null);
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setTaskTarget(emp)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Assign Task
                        </button>
                        <button
                          onClick={() => setAwardTarget(emp)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-600 hover:text-yellow-800 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Award Points
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          disabled={deletingId === emp.employee_id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
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

      {taskTarget && (
        <AssignTaskModal
          employee={taskTarget}
          companyId={user!.companyId}
          onClose={() => setTaskTarget(null)}
          onSuccess={fetchEmployees}
        />
      )}
      {awardTarget && (
        <AwardPointsModal
          employee={awardTarget}
          companyId={user!.companyId}
          onClose={() => setAwardTarget(null)}
          onSuccess={fetchEmployees}
        />
      )}
    </AdminLayout>
  );
}
