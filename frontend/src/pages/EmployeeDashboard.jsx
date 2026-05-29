import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../api/api";
import GreetingBanner from "../components/GreetingBanner";

const TASK_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

const STATUS_BADGE = {
  draft:               { label: "Draft",             cls: "bg-slate-100 text-slate-600" },
  submitted:           { label: "Submitted",          cls: "bg-yellow-100 text-yellow-700" },
  supervisor_approved: { label: "Supervisor Approved",cls: "bg-blue-100 text-blue-700" },
  finance_approved:    { label: "Finance Approved",   cls: "bg-purple-100 text-purple-700" },
  admin_approved:      { label: "Admin Approved",     cls: "bg-green-100 text-green-700" },
  rejected:            { label: "Rejected",           cls: "bg-red-100 text-red-700" },
  reimbursed:          { label: "Reimbursed",         cls: "bg-emerald-100 text-emerald-700" },
};

const PIPELINE_STAGES = [
  { key: "submitted",           label: "Submitted" },
  { key: "finance_approved",    label: "Finance" },
  { key: "admin_approved",      label: "Admin" },
  { key: "reimbursed",          label: "Reimbursed" },
];

const STATUS_ORDER = {
  draft: -1, submitted: 0, supervisor_approved: 0,
  finance_approved: 1, admin_approved: 2, reimbursed: 3, rejected: -2,
};

function PipelineBar({ status }) {
  if (status === "draft") return null;
  if (status === "rejected") return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-xs text-red-500 font-semibold">✕ Rejected</span>
    </div>
  );

  const reached = STATUS_ORDER[status] ?? -1;
  return (
    <div className="flex items-center gap-1 mt-2">
      {PIPELINE_STAGES.map((s, i) => {
        const stageVal = i;
        const done     = reached >= stageVal;
        const current  = reached === stageVal;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-all ${
              done
                ? "bg-green-100 text-green-700 border-green-200"
                : current
                ? "bg-blue-100 text-blue-700 border-blue-200 animate-pulse"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}>
              {done ? "✓" : "○"} {s.label}
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <span className={`text-xs ${done ? "text-green-400" : "text-slate-300"}`}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ title, value, sub, color, icon }) {
  const colors = {
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    yellow:  "bg-yellow-50 border-yellow-200 text-yellow-700",
    green:   "bg-green-50 border-green-200 text-green-700",
    red:     "bg-red-50 border-red-200 text-red-700",
    slate:   "bg-slate-50 border-slate-200 text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.slate}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function ActivityIcon({ type, action }) {
  if (type === "work_report") return "📝";
  if (action === "approved")  return "✅";
  if (action === "rejected")  return "❌";
  return "📋";
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-52 bg-slate-200 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-52 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-52 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [data,     setData]     = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    // Load expense summary + task summary in parallel
    Promise.all([
      api.get("/dashboard/employee"),
      api.get("/dashboard/overview"),
    ])
      .then(([expRes, taskRes]) => {
        setData(expRes.data);
        setTaskData(taskRes.data);
      })
      .catch(() => setError("Failed to load dashboard"));
  }, []);

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">{error}</div>
  );
  if (!data) return <Skeleton />;

  const firstName = (user.full_name || user.email || "").split(" ")[0] || "there";

  return (
    <div className="space-y-6">

      {/* ── GREETING ── */}
      <GreetingBanner />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your Activity Summary</h1>
          <p className="text-xs text-slate-400 mt-0.5">Everything at a glance</p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Link to="/expenses"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
            + Add Expense
          </Link>
          <Link to="/report"
            className="bg-slate-700 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
            + Work Report
          </Link>
          <Link to="/documents"
            className="border border-slate-300 text-slate-600 hover:border-slate-400 text-sm px-4 py-2 rounded-lg font-medium transition">
            My Documents
          </Link>
        </div>
      </div>

      {/* ── EXPENSE STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Expenses"  value={data.total_expenses}    icon="💸" color="slate"  sub="all submitted" />
        <StatCard title="Pending"         value={data.pending_expenses}  icon="⏳" color="yellow" sub="awaiting approval" />
        <StatCard title="Approved"        value={data.approved_expenses} icon="✅" color="green"  sub="approved + reimbursed" />
        <StatCard title="Rejected"        value={data.rejected_expenses} icon="❌" color="red"    sub="needs resubmission" />
      </div>

      {/* ── TASK STAT CARDS ── */}
      {taskData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="My Tasks"
            value={taskData.total_tasks ?? 0}
            icon="📋"
            color="blue"
            sub="total assigned"
          />
          <StatCard
            title="In Progress"
            value={taskData.in_progress_tasks ?? 0}
            icon="⚡"
            color="purple"
            sub="currently active"
          />
          <StatCard
            title="Completed"
            value={taskData.completed_tasks ?? 0}
            icon="✅"
            color="green"
            sub="approved tasks"
          />
          <StatCard
            title="Pending Review"
            value={taskData.pending_tasks ?? 0}
            icon="⏳"
            color="yellow"
            sub="submitted for review"
          />
        </div>
      )}

      {/* ── MAIN ROW: Expenses + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* My Recent Expenses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">My Recent Expenses</h2>
            <Link to="/expenses" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>

          {data.recent_expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">💸</p>
              <p className="text-slate-400 text-sm">No expenses yet</p>
              <Link to="/expenses" className="text-blue-600 text-xs hover:underline mt-1 inline-block">
                Submit your first expense →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_expenses.map((ex) => {
                const badge = STATUS_BADGE[ex.status] || { label: ex.status, cls: "bg-slate-100 text-slate-600" };
                return (
                  <li key={ex.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{ex.title}</p>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">
                          {ex.category} · {new Date(ex.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-700">₹{ex.amount.toLocaleString()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                    <PipelineBar status={ex.status} />
                    {ex.receipt_url && (
                      <a
                        href={ex.receipt_url.startsWith("/uploads")
                          ? `${process.env.REACT_APP_API_URL}${ex.receipt_url}`
                          : ex.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                      >
                        📎 Receipt attached
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Activity</h2>
          </div>
          {data.recent_activity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-slate-400 text-sm">No activity yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_activity.map((a, i) => (
                <li key={i} className="px-5 py-3 flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    <ActivityIcon type={a.type} action={a.action} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-snug">
                      {a.action === "approved" ? "Expense approved" :
                       a.action === "rejected" ? "Expense rejected" :
                       "Report submitted"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{a.title}</p>
                    {a.amount > 0 && (
                      <p className="text-xs text-slate-500">₹{a.amount.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-slate-300 mt-0.5">
                      {new Date(a.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── CHARTS ROW: Monthly expenses + Task breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Monthly expense line chart */}
        {data.monthly_expenses.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Approved Expenses — Last 6 Months</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.monthly_expenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, "Approved"]} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center h-48">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm text-slate-400">No approved expenses yet</p>
          </div>
        )}

        {/* Task status pie chart */}
        {taskData && taskData.total_tasks > 0 ? (() => {
          const taskPie = [
            { name: "In Progress",    value: taskData.in_progress_tasks ?? 0 },
            { name: "Pending Review", value: taskData.pending_tasks      ?? 0 },
            { name: "Completed",      value: taskData.completed_tasks    ?? 0 },
            { name: "New",            value: taskData.new_tasks          ?? 0 },
            { name: "Rejected",       value: taskData.rejected_tasks     ?? 0 },
          ].filter((d) => d.value > 0);
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">My Task Distribution</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={taskPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {taskPie.map((_, i) => (
                      <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })() : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center h-48">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-slate-400">No tasks assigned yet</p>
            <p className="text-xs text-slate-300 mt-1">Tasks appear here once assigned by your supervisor</p>
          </div>
        )}

      </div>

      {/* ── QUICK LINKS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/tasks"
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center gap-3 transition group">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">My Tasks</p>
            <p className="text-xs text-slate-400">View assigned work</p>
          </div>
        </Link>
        <Link to="/work-reports"
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center gap-3 transition group">
          <span className="text-2xl">📝</span>
          <div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">Work Reports</p>
            <p className="text-xs text-slate-400">Submit daily reports</p>
          </div>
        </Link>
        <Link to="/documents"
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center gap-3 transition group">
          <span className="text-2xl">📄</span>
          <div>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600">Documents</p>
            <p className="text-xs text-slate-400">Upload & manage files</p>
          </div>
        </Link>
      </div>

    </div>
  );
}
