"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { adminService, TeamTask } from "@/services/adminService";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";
import { ListChecks } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-yellow-100 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  done:        "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", done: "Done",
};
const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-rose-100 text-rose-700 border-rose-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:    "bg-gray-100 text-gray-600 border-gray-200",
};

const FILTER_OPTIONS = ["all", "open", "in_progress", "done"] as const;

export default function TeamTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.companyId) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await adminService.getTeamTasks(user!.companyId);
      setTasks(data || []);
    } catch {
      toast.error("Failed to load team tasks");
    } finally {
      setLoading(false);
    }
  };

  const filtered = tasks.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.employee_name?.toLowerCase().includes(q) ||
        t.project_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    open:        tasks.filter(t => t.status === "open").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done:        tasks.filter(t => t.status === "done").length,
  };

  return (
    <AdminLayout title="Team Tasks" subtitle="All tasks across employees and projects.">
      {/* Summary stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["open", "in_progress", "done"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(f => f === s ? "all" : s)}
            className={`rounded-xl border p-4 text-left transition-all shadow-sm ${
              filter === s
                ? STATUS_STYLES[s] + " border"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <p className="text-2xl font-bold">{counts[s]}</p>
            <p className="text-xs mt-1 font-medium uppercase tracking-wider">{STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by task, employee, or project..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
        />
        <div className="flex gap-2">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filter === f
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16 shadow-sm">
          <ListChecks className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">Assign tasks to employees from the Employees page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Employee", "Project", "Task", "Description", "Status", "Priority", "Due Date", "Points"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(task => (
                  <tr key={`${task.employee_id}-${task.task_id}`} className="hover:bg-gray-50 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {task.employee_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-gray-900 whitespace-nowrap">{task.employee_name || "—"}</span>
                      </div>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3">
                      {task.project_name ? (
                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          {task.project_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Task title */}
                    <td className="px-4 py-3 font-semibold text-gray-900 max-w-[180px]">
                      <span className="line-clamp-1">{task.title}</span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                      <span className="line-clamp-1">
                        {task.description ? task.description.slice(0, 60) + (task.description.length > 60 ? "…" : "") : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[task.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      {task.priority ? (
                        <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full border ${PRIORITY_STYLES[task.priority.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {task.priority}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Due date */}
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                    </td>

                    {/* Points */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        {task.employee_points ?? 0} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {filtered.length} of {tasks.length} tasks
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
