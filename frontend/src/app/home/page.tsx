"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuth } from "firebase/auth";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Home } from "lucide-react";

interface LeaveBalance { annual: number; casual: number; sick: number; }
interface Task {
  task_id: string;
  title: string;
  status: string;
  due_date?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ annual: 0, casual: 0, sick: 0 });
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.companyId || !user?.employeeId) return;

    const fetchAll = async () => {
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        const [taskRes, leaveRes, profileRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employee/${user.companyId}/${user.employeeId}/tasks`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employee/${user.companyId}/${user.employeeId}/leave-balance`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employee/${user.companyId}/${user.employeeId}/profile`, { headers }),
        ]);

        if (taskRes.ok) {
          const d = await taskRes.json();
          setTasks(d.tasks || []);
        }
        if (leaveRes.ok) {
          const d = await leaveRes.json();
          setLeaveBalance(d || { annual: 0, casual: 0, sick: 0 });
        }
        if (profileRes.ok) {
          const d = await profileRes.json();
          setDepartment(d.department || "");
        }
      } catch {
        // Non-blocking — show zeros on error
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.companyId, user?.employeeId]);

  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const openTasks = tasks.filter(t => t.status === "open").length;
  const totalLeave = leaveBalance.annual + leaveBalance.sick + leaveBalance.casual;
  const dueSoon = tasks.filter(t => {
    if (!t.due_date || t.status === "done") return false;
    const d = new Date(t.due_date);
    return d >= today && d <= in7Days;
  }).length;

  const displayName = user?.displayName?.split(" ")[0] || "there";

  const statCards = [
    { icon: "⭐", label: "Tasks Open", value: `${openTasks} open` },
    { icon: "📋", label: "Due Soon", value: `${dueSoon} task${dueSoon !== 1 ? "s" : ""}` },
    { icon: "🏖️", label: "Leave Days", value: `${totalLeave} days` },
  ];

  return (
    <EmployeeLayout>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center mr-4 shadow-sm">
          <Home className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Home</h1>
          <p className="text-xs text-gray-500">Your daily overview</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Welcome card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Greeting bar */}
            <div className="bg-brand-600 px-6 py-5">
              <p className="text-xl font-bold text-white">
                {getGreeting()}, {displayName} 👋
              </p>
              <p className="text-sm text-brand-100 mt-0.5">
                {department ? `${department} · ` : ""}AI Chief of Staff Platform
              </p>
            </div>

            {/* Stat row */}
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
              </div>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {statCards.map((s) => (
                  <div key={s.label} className="px-6 py-4 text-center">
                    <p className="text-2xl mb-0.5">{s.icon}</p>
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave breakdown */}
          {!loading && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Leave Balance</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Annual", value: leaveBalance.annual, color: "bg-emerald-100 text-emerald-700" },
                  { label: "Sick", value: leaveBalance.sick, color: "bg-rose-100 text-rose-700" },
                  { label: "Casual", value: leaveBalance.casual, color: "bg-blue-100 text-blue-700" },
                ].map(l => (
                  <div key={l.label} className={`rounded-xl p-4 text-center ${l.color}`}>
                    <p className="text-2xl font-bold">{l.value}</p>
                    <p className="text-xs font-medium mt-0.5">{l.label} days</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due soon tasks */}
          {!loading && dueSoon > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-4">⚠️ Due Within 7 Days</h2>
              <div className="space-y-2">
                {tasks
                  .filter(t => {
                    if (!t.due_date || t.status === "done") return false;
                    const d = new Date(t.due_date);
                    return d >= today && d <= in7Days;
                  })
                  .map(t => {
                    const daysLeft = Math.ceil(
                      (new Date(t.due_date!).getTime() - new Date().getTime())
                      / (1000 * 60 * 60 * 24)
                    );
                    const urgency =
                      daysLeft <= 2 ? { cls: "bg-red-50 border-red-200 text-red-600",    dot: "🔴" } :
                      daysLeft <= 4 ? { cls: "bg-orange-50 border-orange-200 text-orange-600", dot: "🟠" } :
                                      { cls: "bg-yellow-50 border-yellow-200 text-yellow-600", dot: "🟡" };
                    return (
                      <div key={t.task_id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800 font-medium">{t.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            📅 {new Date(t.due_date!).toLocaleDateString()}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${urgency.cls}`}>
                            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left {urgency.dot}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </div>
      </div>
    </EmployeeLayout>
  );
}
