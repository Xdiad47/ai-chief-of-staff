"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuth } from "firebase/auth";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

interface Task {
  task_id: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "done";
  due_date?: string;
  priority?: "low" | "medium" | "high";
}

const STATUS_STYLES: Record<string, { badge: string; card: string }> = {
  open:        { badge: "bg-yellow-100 text-yellow-700 border-yellow-200",  card: "border-l-yellow-400"  },
  in_progress: { badge: "bg-blue-100 text-blue-700 border-blue-200",        card: "border-l-blue-400"    },
  done:        { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", card: "border-l-emerald-400" },
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", done: "Done",
};
const PRIORITY_COLORS: Record<string, string> = {
  high: "text-rose-600 bg-rose-50 border-rose-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-gray-500 bg-gray-100 border-gray-200",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState<string>("all");

  useEffect(() => {
    if (!user?.companyId || !user?.employeeId) return;
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) { setError("Not authenticated"); return; }
        const res = await fetch(
          `/api/employee/${user!.companyId}/${user!.employeeId}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to load tasks");
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user?.companyId, user?.employeeId]);

  const updateTaskStatus = async (task_id: string, newStatus: Task["status"]) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.task_id === task_id ? { ...t, status: newStatus } : t));
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(
        `/api/employee/${user!.companyId}/${user!.employeeId}/tasks/${task_id}?status=${newStatus}`,
        { method: "PATCH", headers }
      );
      if (!res.ok) {
        setTasks(prev => prev.map(t => t.task_id === task_id ? { ...t, status: t.status } : t));
        return;
      }

      // Suggest points when task is marked done
      if (newStatus === "done") {
        try {
          const pointsRes = await fetch(
            `/api/employee/${user!.companyId}/${user!.employeeId}/tasks/${task_id}/suggest-points`,
            { method: "POST", headers }
          );
          if (pointsRes.ok) {
            const { suggested_points, reason } = await pointsRes.json();
            toast(`🎉 Task completed! AI suggests ${suggested_points} points — ${reason}.`, {
              duration: 5000,
              style: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" },
            });
          }
        } catch {
          // Non-blocking — status update already succeeded
        }
      }
    } catch {
      // Silently fail
    }
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  const counts = {
    open:        tasks.filter(t => t.status === "open").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done:        tasks.filter(t => t.status === "done").length,
  };

  return (
    <EmployeeLayout>
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-4 shadow-sm">
          <CheckSquare className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">My Tasks</h1>
          <p className="text-xs text-gray-500">
            {counts.open} open · {counts.done} completed · {tasks.length} total
          </p>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Summary stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {(["open", "in_progress", "done"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(f => f === s ? "all" : s)}
                  className={`rounded-xl border p-4 text-left transition-all shadow-sm ${
                    filter === s
                      ? STATUS_STYLES[s].badge + " border"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <p className="text-2xl font-bold">{counts[s]}</p>
                  <p className="text-xs mt-1 font-medium uppercase tracking-wider">{STATUS_LABELS[s]}</p>
                </button>
              ))}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "open", "in_progress", "done"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                    filter === f
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {f === "all" ? "All Tasks" : STATUS_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Task list */}
            {filtered.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl text-center py-16 shadow-sm">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-medium text-gray-700">No tasks here</p>
                <p className="text-sm text-gray-400 mt-1">Your assigned tasks will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(task => (
                  <div
                    key={task.task_id}
                    className={`bg-white border border-gray-200 border-l-4 ${STATUS_STYLES[task.status].card} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-semibold text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.due_date && (
                            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                              📅 Due {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.priority && (
                            <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                              {task.priority} priority
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[task.status].badge}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    {/* Status pill buttons */}
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      {(["open", "in_progress", "done"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => task.status !== s && updateTaskStatus(task.task_id, s)}
                          className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                            task.status === s
                              ? STATUS_STYLES[s].badge + " cursor-default"
                              : "bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
