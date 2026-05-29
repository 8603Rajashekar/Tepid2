import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api/api";
import GreetingBanner from "../components/GreetingBanner";

// ── Constants ────────────────────────────────────────────────────────────
const CALL_TYPES = [
  { key: "service",  label: "Service",  icon: "🔧", color: "#3b82f6" },
  { key: "issue",    label: "Issue",    icon: "⚠️",  color: "#ef4444" },
  { key: "enquiry",  label: "Enquiry",  icon: "💬", color: "#8b5cf6" },
  { key: "order",    label: "Order",    icon: "🛒", color: "#10b981" },
];

const EXPENSE_BADGE = {
  draft:               { label: "Draft",              cls: "bg-slate-100 text-slate-600" },
  submitted:           { label: "Submitted",           cls: "bg-yellow-100 text-yellow-700" },
  supervisor_approved: { label: "Supervisor Approved", cls: "bg-blue-100 text-blue-700" },
  finance_approved:    { label: "Finance Approved",    cls: "bg-purple-100 text-purple-700" },
  admin_approved:      { label: "Admin Approved",      cls: "bg-green-100 text-green-700" },
  rejected:            { label: "Rejected",            cls: "bg-red-100 text-red-700" },
  reimbursed:          { label: "Reimbursed",          cls: "bg-emerald-100 text-emerald-700" },
};

const STATUS_ORDER = {
  draft: -1, submitted: 0, supervisor_approved: 0,
  finance_approved: 1, admin_approved: 2, reimbursed: 3, rejected: -2,
};

const PIPELINE_STAGES = [
  { key: "submitted",        label: "Submitted" },
  { key: "finance_approved", label: "Finance"   },
  { key: "admin_approved",   label: "Admin"     },
  { key: "reimbursed",       label: "Paid"      },
];

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon, colorCls }) {
  return (
    <div className={`rounded-xl border p-4 ${colorCls}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function PipelineBar({ status }) {
  if (status === "draft") return null;
  if (status === "rejected") return (
    <p className="text-xs text-red-500 font-semibold mt-1">✕ Rejected</p>
  );
  const reached = STATUS_ORDER[status] ?? -1;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {PIPELINE_STAGES.map((s, i) => {
        const done    = reached >= i;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              done ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"
            }`}>
              {done ? "✓" : "○"} {s.label}
            </span>
            {i < PIPELINE_STAGES.length - 1 && (
              <span className={`text-xs ${done ? "text-green-400" : "text-slate-300"}`}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-slate-200 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CRMDashboard() {
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const firstName = (user.full_name || user.email || "").split(" ")[0] || "there";

  const [calls,    setCalls]    = useState([]);
  const [followups,setFollowups]= useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/crm/"),
      api.get("/crm/follow-ups"),
      api.get("/expenses/my"),
      api.get("/reports/me"),
    ])
      .then(([callsRes, fuRes, expRes, repRes]) => {
        setCalls(callsRes.data);
        setFollowups(fuRes.data);
        setExpenses(expRes.data);
        setReports(repRes.data);
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error)   return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">{error}</div>
  );

  // ── CRM stats ──────────────────────────────────────────────────────────
  const callStats = CALL_TYPES.reduce((acc, t) => {
    acc[t.key] = calls.filter((c) => c.call_type === t.key).length;
    return acc;
  }, {});

  const activeStats = CALL_TYPES.reduce((acc, t) => {
    acc[t.key] = calls.filter((c) => c.call_type === t.key && !["closed","resolved"].includes(c.status)).length;
    return acc;
  }, {});

  const pieData = CALL_TYPES
    .map((t) => ({ name: t.label, value: callStats[t.key], fill: t.color, icon: t.icon }))
    .filter((d) => d.value > 0);

  const totalCalls  = calls.length;
  const openCalls   = calls.filter((c) => !["closed","resolved"].includes(c.status)).length;

  // ── Expense stats ──────────────────────────────────────────────────────
  const expPending  = expenses.filter((e) =>
    ["submitted","supervisor_approved","finance_approved"].includes(e.status)).length;
  const expApproved = expenses.filter((e) =>
    ["admin_approved","reimbursed"].includes(e.status)).length;
  const expRejected = expenses.filter((e) => e.status === "rejected").length;

  // ── Work report stats ──────────────────────────────────────────────────
  const totalHours  = reports.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const lastReport  = reports[0];

  return (
    <div className="space-y-7">

      {/* ── GREETING ── */}
      <GreetingBanner />

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Today's overview</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/crm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
            + Log Call
          </Link>
          <Link to="/crm"
            className="bg-slate-700 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
            + Work Report
          </Link>
          <Link to="/expenses"
            className="border border-slate-300 text-slate-600 hover:border-slate-400 text-sm px-4 py-2 rounded-lg font-medium transition">
            My Expenses
          </Link>
        </div>
      </div>

      {/* ── FOLLOW-UP ALERTS ── */}
      {followups.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700 mb-1">
            🔔 {followups.length} Follow-up{followups.length > 1 ? "s" : ""} Due Today
          </p>
          <div className="space-y-1.5 mt-2">
            {followups.slice(0, 3).map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{f.customer_name}</p>
                  <p className="text-xs text-slate-400">{f.phone} · {CALL_TYPES.find(t => t.key === f.call_type)?.label}</p>
                </div>
                <span className="text-xs text-red-600 font-medium">
                  {new Date(f.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
            {followups.length > 3 && (
              <p className="text-xs text-red-500 pl-1">+{followups.length - 3} more — <Link to="/crm" className="underline">view all</Link></p>
            )}
          </div>
        </div>
      )}

      {/* ── CRM CALL STAT CARDS ── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">CRM Call Types</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CALL_TYPES.map((t) => (
            <div key={t.key} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.label}</p>
                <span className="text-xl">{t.icon}</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{callStats[t.key]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{activeStats[t.key]} active</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PIE CHART + OPEN CALLS SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Call Distribution Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Call Type Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">{totalCalls} total · {openCalls} still open</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              <div className="text-center">
                <p className="text-3xl mb-2">📞</p>
                No calls logged yet
              </div>
            </div>
          )}
        </div>

        {/* Quick stats panel */}
        <div className="space-y-4">
          {/* Call summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Call Summary</h3>
            {CALL_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <span className="text-base w-5 text-center flex-shrink-0">{t.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-medium text-slate-600">{t.label} Calls</p>
                    <p className="text-xs font-bold text-slate-700">{callStats[t.key]}</p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: totalCalls > 0 ? `${(callStats[t.key] / totalCalls) * 100}%` : "0%",
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Work report snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Work Reports</h3>
              <Link to="/crm" className="text-xs text-blue-600 hover:underline">+ Submit →</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{reports.length}</p>
                <p className="text-xs text-slate-400">Total reports</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{totalHours}h</p>
                <p className="text-xs text-slate-400">Hours logged</p>
              </div>
            </div>
            {lastReport ? (
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">
                  Last report — {new Date(lastReport.report_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lastReport.summary}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">No reports yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── MY EXPENSES ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">My Expenses</h2>
          <Link to="/expenses" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>

        {/* Expense stat row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard
            title="Pending"
            value={expPending}
            sub="awaiting approval"
            icon="⏳"
            colorCls="bg-yellow-50 border-yellow-200 text-yellow-800"
          />
          <StatCard
            title="Approved"
            value={expApproved}
            sub="approved + reimbursed"
            icon="✅"
            colorCls="bg-green-50 border-green-200 text-green-800"
          />
          <StatCard
            title="Rejected"
            value={expRejected}
            sub="needs resubmission"
            icon="❌"
            colorCls="bg-red-50 border-red-200 text-red-800"
          />
        </div>

        {/* Recent expense cards */}
        {expenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-3xl">💸</p>
            <p className="text-sm text-slate-400">No expenses yet</p>
            <Link to="/expenses" className="text-xs text-blue-600 hover:underline font-medium">+ Add expense</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {expenses.slice(0, 5).map((ex) => {
              const badge = EXPENSE_BADGE[ex.status] || { label: ex.status, cls: "bg-slate-100 text-slate-600" };
              return (
                <div key={ex.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{ex.title}</p>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {ex.category} · {new Date(ex.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-slate-700">₹{parseFloat(ex.amount).toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                  <PipelineBar status={ex.status} />
                </div>
              );
            })}
            {expenses.length > 5 && (
              <div className="px-5 py-3 text-center">
                <Link to="/expenses" className="text-xs text-blue-600 hover:underline font-medium">
                  View {expenses.length - 5} more expenses →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── RECENT WORK REPORTS ── */}
      {reports.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Recent Work Reports</h2>
            <Link to="/work-reports" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {reports.slice(0, 3).map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    {new Date(r.report_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                  </p>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                    {r.hours_logged}h
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{r.summary}</p>
                {r.blockers && (
                  <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs text-red-700">
                    <span className="font-semibold">Blocker:</span> {r.blockers}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
