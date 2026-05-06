"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuth } from "firebase/auth";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

interface LeaveBalance {
  annual: number;
  casual: number;
  sick: number;
}
interface LeaveData {
  leave_balance: LeaveBalance;
  total_remaining: number;
}

const LEAVE_META = {
  annual: {
    label: "Annual Leave",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "🏖️",
    desc: "Planned vacations & personal time off",
  },
  casual: {
    label: "Casual Leave",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "☕",
    desc: "Short unplanned absences",
  },
  sick: {
    label: "Sick Leave",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: "🏥",
    desc: "Medical & health-related leave",
  },
};

export default function LeavesPage() {
  const { user } = useAuth();
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ leave_type: "annual", days: 1, reason: "" });
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user?.companyId || !user?.employeeId) return;
    fetchLeaves();
  }, [user?.companyId, user?.employeeId]);

  async function fetchLeaves() {
    try {
      setLoading(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError("Not authenticated"); return; }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee/${user!.companyId}/${user!.employeeId}/leave-balance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load leave data");
      const balance = await res.json();
      const total = Object.values(balance as Record<string, number>).reduce((a, b) => a + b, 0);
      setLeaveData({ leave_balance: balance, total_remaining: total });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason.trim()) { setMsg({ ok: false, text: "Please add a reason." }); return; }
    try {
      setApplying(true); setMsg(null);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const params = new URLSearchParams({
        leave_type: form.leave_type,
        days: String(form.days),
        reason: form.reason,
      });
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employee/${user!.companyId}/${user!.employeeId}/leaves/apply?${params}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to apply");
      setMsg({ ok: true, text: data.message });
      setForm({ leave_type: "annual", days: 1, reason: "" });
      fetchLeaves();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setApplying(false);
    }
  }

  return (
    <EmployeeLayout>
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-4 shadow-sm">
          <Calendar className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">My Leaves</h1>
          <p className="text-xs text-gray-500">
            {leaveData ? `${leaveData.total_remaining} days remaining across all types` : "Manage your leave requests"}
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
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Leave balance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {leaveData?.leave_balance && (Object.entries(leaveData.leave_balance) as [keyof typeof LEAVE_META, number][]).map(([type, days]) => {
                const m = LEAVE_META[type];
                return (
                  <div key={type} className={`rounded-xl border ${m.border} ${m.bg} p-5 bg-white shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg">{m.icon}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.color} border ${m.border}`}>
                        {days} days
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${m.color}`}>{days}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Apply for leave form */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Apply for Leave
              </h2>
              <form onSubmit={handleApply} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Leave Type</label>
                    <select
                      value={form.leave_type}
                      onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="annual">Annual Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Number of Days</label>
                    <input
                      type="number" min={1} max={30} value={form.days}
                      onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">Reason</label>
                  <textarea
                    rows={3} value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Briefly describe your reason..."
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  />
                </div>

                {msg && (
                  <div className={`text-sm rounded-lg px-3 py-2 border flex items-center gap-2 ${
                    msg.ok
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {msg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    {msg.text}
                  </div>
                )}

                <button
                  type="submit" disabled={applying}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
                >
                  {applying ? "Submitting..." : "Submit Leave Request"}
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
