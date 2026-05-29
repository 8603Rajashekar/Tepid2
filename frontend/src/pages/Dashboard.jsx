import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import api from "../api/api";
import StatCard from "../components/StatCard";
import GreetingBanner from "../components/GreetingBanner";

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

// Role-specific quick actions shown as shortcuts below the header
const QUICK_ACTIONS = {
  admin: [
    { to: "/tasks",         icon: "📋", label: "Manage Tasks",   sub: "Create & review" },
    { to: "/approvals",     icon: "✅", label: "Approvals",      sub: "Pending actions"  },
    { to: "/users",         icon: "👥", label: "Manage Users",   sub: "Roles & accounts" },
    { to: "/expenses",      icon: "💸", label: "Expenses",       sub: "Final approvals"  },
  ],
  super_admin: [
    { to: "/tasks",         icon: "📋", label: "Manage Tasks",   sub: "Create & review" },
    { to: "/approvals",     icon: "✅", label: "Approvals",      sub: "Pending actions"  },
    { to: "/users",         icon: "👥", label: "Manage Users",   sub: "Roles & accounts" },
    { to: "/expenses",      icon: "💸", label: "Expenses",       sub: "Final approvals"  },
  ],
  supervisor: [
    { to: "/tasks",         icon: "📋", label: "Team Tasks",     sub: "Assign & review"  },
    { to: "/approvals",     icon: "✅", label: "Approvals",      sub: "Pending review"   },
    { to: "/service-calls", icon: "📞", label: "Service Calls",  sub: "Active calls"     },
    { to: "/work-reports",  icon: "📝", label: "Work Reports",   sub: "Team reports"     },
  ],
  finance: [
    { to: "/approvals",     icon: "✅", label: "Review Expenses",sub: "Finance approval" },
    { to: "/expenses",      icon: "💸", label: "All Expenses",   sub: "Full pipeline"    },
    { to: "/tasks",         icon: "📋", label: "My Tasks",       sub: "Assigned to me"   },
    { to: "/documents",     icon: "📄", label: "Documents",      sub: "Review files"     },
  ],
  finance_officer: [
    { to: "/approvals",     icon: "✅", label: "Review Expenses",sub: "Finance approval" },
    { to: "/expenses",      icon: "💸", label: "All Expenses",   sub: "Full pipeline"    },
    { to: "/tasks",         icon: "📋", label: "My Tasks",       sub: "Assigned to me"   },
    { to: "/documents",     icon: "📄", label: "Documents",      sub: "Review files"     },
  ],
  coordinator: [
    { to: "/tasks",         icon: "📋", label: "Tasks",          sub: "Assign & track"   },
    { to: "/service-calls", icon: "📞", label: "Service Calls",  sub: "Manage calls"     },
    { to: "/expenses",      icon: "💸", label: "My Expenses",    sub: "Submit & track"   },
    { to: "/work-reports",  icon: "📝", label: "Reports",        sub: "Submit reports"   },
  ],
  service_coordinator: [
    { to: "/service-calls", icon: "📞", label: "Service Calls",  sub: "Manage calls"     },
    { to: "/tasks",         icon: "📋", label: "Tasks",          sub: "Assign & track"   },
    { to: "/expenses",      icon: "💸", label: "My Expenses",    sub: "Submit & track"   },
    { to: "/work-reports",  icon: "📝", label: "Reports",        sub: "Submit reports"   },
  ],
};

const ROLE_TITLE = {
  admin:               "Admin Overview",
  super_admin:         "Admin Overview",
  supervisor:          "Team Overview",
  finance:             "Finance Overview",
  finance_officer:     "Finance Overview",
  coordinator:         "Operations Overview",
  service_coordinator: "Service Overview",
};

const ROLE_SUBTITLE = {
  admin:               "Full system visibility · live data",
  super_admin:         "Full system visibility · live data",
  supervisor:          "Your team's tasks, calls, and approvals",
  finance:             "Expense approvals · payments · pipeline",
  finance_officer:     "Expense approvals · payments · pipeline",
  coordinator:         "Tasks, service calls and your activity",
  service_coordinator: "Service calls, tasks and field operations",
};

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

function QuickActionCard({ to, icon, label, sub, highlight }) {
  return (
    <Link
      to={to}
      className={`rounded-xl border p-4 flex items-center gap-3 transition group hover:shadow-md ${
        highlight
          ? "bg-yellow-50 border-yellow-200 hover:border-yellow-400"
          : "bg-white border-slate-200 hover:border-blue-300"
      }`}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold truncate ${highlight ? "text-yellow-800" : "text-slate-700 group-hover:text-blue-600"}`}>
          {label}
        </p>
        <p className={`text-xs truncate ${highlight ? "text-yellow-600" : "text-slate-400"}`}>{sub}</p>
      </div>
      <span className={`ml-auto text-xs flex-shrink-0 ${highlight ? "text-yellow-500" : "text-slate-300 group-hover:text-blue-400"}`}>→</span>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-slate-200 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const role = localStorage.getItem("role") || "";
  const isFinance = role === "finance" || role === "finance_officer";

  const [data,  setData]  = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const overview = await api.get("/dashboard/overview");
      setData(overview.data);
      setError(null);
    } catch {
      setError("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    load();

    // WebSocket for instant updates — falls back to polling if unavailable
    const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:8001"}/ws/dashboard`;
    let ws;
    let pingInterval;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25_000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "task_update") load();
        } catch {}
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        setTimeout(connectWs, 5_000);
      };
    };

    connectWs();
    const pollId = setInterval(load, 30_000);

    return () => {
      clearInterval(pollId);
      clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">
      {error}
    </div>
  );
  if (!data) return <Skeleton />;

  const taskPieData = [
    { name: "Pending",     value: data.pending_tasks     },
    { name: "In Progress", value: data.in_progress_tasks },
    { name: "Completed",   value: data.completed_tasks   },
    { name: "New",         value: data.new_tasks         },
    { name: "Rejected",    value: data.rejected_tasks    },
  ].filter((d) => d.value != null && d.value > 0);

  const callBarData = data.active_calls != null ? [
    { name: "Unassigned", count: data.unassigned_calls ?? 0, fill: "#f59e0b" },
    { name: "Active",     count: data.active_calls      ?? 0, fill: "#3b82f6" },
    { name: "Escalated",  count: data.sla_risks         ?? 0, fill: "#ef4444" },
    { name: "Resolved",   count: data.resolved_calls    ?? 0, fill: "#10b981" },
  ] : [];

  const hasSlaRisk    = (data.sla_risks ?? 0) > 0;
  const quickActions  = QUICK_ACTIONS[role] || [];
  const dashTitle     = ROLE_TITLE[role]    || "Dashboard";
  const dashSubtitle  = ROLE_SUBTITLE[role] || "Live overview";

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <GreetingBanner />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{dashTitle}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {dashSubtitle}
            {data.scope && (
              <span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold capitalize">
                {data.scope.replace(/_/g, " ")}
              </span>
            )}
          </p>
        </div>
        {hasSlaRisk && (
          <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full font-semibold animate-pulse">
            ⚠ SLA Risk — {data.sla_risks} escalated
          </span>
        )}
      </div>

      {/* ── QUICK ACTIONS ── */}
      {quickActions.length > 0 && (
        <section>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <QuickActionCard
                key={a.to + a.label}
                {...a}
                highlight={a.to === "/approvals" && (data.pending_approvals ?? 0) > 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── TOP STAT CARDS ── */}
      <section>
        <SectionTitle>{isFinance ? "Finance Pipeline" : "Overview"}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isFinance ? (
            /* Finance-specific cards */
            <>
              <StatCard
                title="Awaiting Your Review"
                value={data.expenses_pending ?? 0}
                sub={<Link to="/approvals" className="underline text-yellow-600">Go to Approvals →</Link>}
                color="yellow"
                icon="💸"
              />
              <StatCard
                title="Pending Approvals"
                value={data.pending_approvals ?? "—"}
                sub="tasks + expenses + docs"
                color={data.pending_approvals > 0 ? "orange" : "green"}
                icon="⏳"
              />
              <StatCard
                title="My Tasks"
                value={data.total_tasks ?? "—"}
                sub={`${data.completed_tasks ?? 0} completed · ${data.in_progress_tasks ?? 0} in progress`}
                color="blue"
                icon="📋"
              />
              <StatCard
                title="Total Expenses"
                value={data.expenses_total ?? "—"}
                sub={`₹${(data.pending_amount ?? 0).toLocaleString()} pending value`}
                color="slate"
                icon="💰"
              />
            </>
          ) : (
            /* General admin/supervisor/coordinator cards */
            <>
              <StatCard
                title="Total Tasks"
                value={data.total_tasks}
                sub={`${data.in_progress_tasks ?? 0} in progress · ${data.completed_tasks ?? 0} done`}
                color="blue"
                icon="📋"
              />
              <StatCard
                title="Service Calls"
                value={data.active_calls ?? "—"}
                sub={data.unassigned_calls != null ? `${data.unassigned_calls} unassigned` : "No access"}
                color={data.active_calls != null ? "purple" : "slate"}
                icon="📞"
              />
              <StatCard
                title="Pending Approvals"
                value={data.pending_approvals ?? "—"}
                sub={data.pending_approvals != null ? (
                  <Link to="/approvals" className="underline">Open center</Link>
                ) : "No access"}
                color={data.pending_approvals != null && data.pending_approvals > 0 ? "yellow" : "slate"}
                icon="⏳"
              />
              <StatCard
                title="Total Expenses"
                value={data.expenses_total ?? "—"}
                sub={
                  data.expenses_pending != null && data.expenses_pending > 0
                    ? <Link to="/expenses" className="underline text-orange-600">{data.expenses_pending} pending approval →</Link>
                    : "all approved or reimbursed"
                }
                color={data.expenses_pending > 0 ? "orange" : "green"}
                icon="💸"
              />
            </>
          )}
        </div>
      </section>

      {/* ── PENDING APPROVAL ALERT ── */}
      {(data.pending_approvals ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {data.pending_approvals} item{data.pending_approvals !== 1 ? "s" : ""} waiting for your approval
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {isFinance
                ? "Expense reports submitted by employees need your finance review"
                : "Tasks, documents and expenses pending action"}
            </p>
          </div>
          <Link
            to="/approvals"
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex-shrink-0"
          >
            Review Now →
          </Link>
        </div>
      )}

      {/* ── CHARTS ROW (only for roles with full access) ── */}
      {!isFinance && (
        <>
          {/* ── MIDDLE ROW: Pie + SLA Alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Pie */}
            {taskPieData.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Distribution</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={taskPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {taskPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center h-64">
                <p className="text-sm text-slate-400">No task data available</p>
              </div>
            )}

            {/* SLA Alerts + Service Call bar */}
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${hasSlaRisk ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${hasSlaRisk ? "text-red-600" : "text-green-600"}`}>
                      SLA Status
                    </p>
                    <p className={`text-4xl font-bold mt-1 ${hasSlaRisk ? "text-red-700" : "text-green-700"}`}>
                      {data.sla_risks ?? "—"}
                    </p>
                  </div>
                  <span className="text-4xl">{hasSlaRisk ? "🚨" : "✅"}</span>
                </div>
                {hasSlaRisk ? (
                  <p className="text-xs text-red-500 mt-2">
                    {data.sla_risks} call{data.sla_risks !== 1 ? "s" : ""} escalated — immediate attention needed
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-2">All service calls within SLA ✓</p>
                )}
              </div>

              {callBarData.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Service Calls by Status</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={callBarData} barSize={28}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {callBarData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ── TASK BREAKDOWN ── */}
          <section>
            <SectionTitle>Task Breakdown</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="New"            value={data.new_tasks}         color="slate"  icon="🆕" />
              <StatCard title="In Progress"    value={data.in_progress_tasks} color="blue"   icon="⚡" />
              <StatCard title="Pending Review" value={data.pending_tasks}     color="yellow" icon="⏳" />
              <StatCard title="Completed"      value={data.completed_tasks}   color="green"  icon="✅" />
            </div>
          </section>

          {/* Task Status Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart barSize={32} data={[
                { name: "New",        value: data.new_tasks,         fill: "#94a3b8" },
                { name: "In Progress",value: data.in_progress_tasks, fill: "#3b82f6" },
                { name: "Review",     value: data.pending_tasks,     fill: "#f59e0b" },
                { name: "Completed",  value: data.completed_tasks,   fill: "#10b981" },
                { name: "Rejected",   value: data.rejected_tasks,    fill: "#ef4444" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { fill: "#94a3b8" },
                    { fill: "#3b82f6" },
                    { fill: "#f59e0b" },
                    { fill: "#10b981" },
                    { fill: "#ef4444" },
                  ].map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── FINANCE: Expense pipeline mini-view ── */}
      {isFinance && (
        <section>
          <SectionTitle>Expense Pipeline</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600 mb-1">Submitted</p>
              <p className="text-3xl font-bold text-yellow-800">{data.expenses_pending ?? 0}</p>
              <p className="text-xs text-yellow-600 mt-1">Awaiting your finance review</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Finance Approved</p>
              <p className="text-3xl font-bold text-purple-800">{data.finance_approved_count ?? 0}</p>
              <p className="text-xs text-purple-600 mt-1">Waiting for admin final approval</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">Approved & Paid</p>
              <p className="text-3xl font-bold text-green-800">{data.expenses_approved ?? 0}</p>
              <p className="text-xs text-green-600 mt-1">Admin approved or reimbursed</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              to="/approvals"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2"
            >
              ✅ Open Approval Center →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
