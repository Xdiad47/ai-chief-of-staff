'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { adminService, TeamTask } from '../../services/adminService';
import { useAuth } from '../../lib/auth-context';
import { Project } from '../../types';
import toast from 'react-hot-toast';
import { Plus, FolderOpen, X, Calendar, Building2, Users } from 'lucide-react';

// ── Add Project Modal ─────────────────────────────────────────────────────────

interface AddProjectModalProps {
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddProjectModal({ companyId, onClose, onSuccess }: AddProjectModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    department: '',
    status: 'active',
    priority: 'MEDIUM',
    deadline: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }

    try {
      setSaving(true);
      await adminService.addProject({
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim(),
        department: form.department.trim(),
        status: form.status,
        priority: form.priority,
        deadline: form.deadline,
      });
      toast.success('Project created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map((e: any) => e.msg).join(', '));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Failed to create project. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-bold text-gray-900">Add New Project</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Website Redesign"
              required
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
              placeholder="Briefly describe this project..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                Department <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Engineering"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
              Deadline <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────

function statusVariant(status: string): 'green' | 'yellow' | 'gray' {
  const s = status.toLowerCase();
  if (s === 'active') return 'green';
  if (s === 'on-hold' || s === 'on_hold') return 'yellow';
  return 'gray';
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.companyId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [projData, taskData] = await Promise.all([
        adminService.getProjects(user!.companyId),
        adminService.getTeamTasks(user!.companyId),
      ]);
      setProjects(projData || []);
      setTeamTasks(taskData || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = fetchAll;

  return (
    <AdminLayout title="Projects" subtitle="Manage and track all company projects.">
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-12 h-12 text-gray-400" />}
          title="No projects yet"
          description="Get started by creating your first project."
          action={{ label: 'Add Project', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map(proj => {
            const projTasks = teamTasks.filter(t => t.project_id === proj.project_id);
            const assignedNames = Array.from(new Set(projTasks.map(t => t.employee_name).filter(Boolean)));
            const openCount = projTasks.filter(t => t.status !== "done").length;
            const doneCount = projTasks.filter(t => t.status === "done").length;

            return (
              <Card key={proj.project_id} className="flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{proj.name}</h3>
                  <Badge variant={statusVariant(proj.status)} className="shrink-0">
                    {proj.status}
                  </Badge>
                </div>

                {proj.department && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{proj.department}</span>
                  </div>
                )}

                {proj.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due {proj.deadline}</span>
                  </div>
                )}

                {proj.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{proj.description}</p>
                )}

                {/* Task count */}
                {projTasks.length > 0 && (
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{projTasks.length}</span> task{projTasks.length !== 1 ? "s" : ""}
                      {" · "}
                      <span className="text-emerald-600 font-semibold">{doneCount} done</span>
                      {openCount > 0 && <span className="text-yellow-600"> · {openCount} open</span>}
                    </span>
                  </div>
                )}

                {/* Assigned employees */}
                {assignedNames.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {assignedNames.map(name => (
                        <span key={name} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddProjectModal
          companyId={user!.companyId}
          onClose={() => setShowModal(false)}
          onSuccess={fetchProjects}
        />
      )}
    </AdminLayout>
  );
}
