

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import api from "../api/api";
import StatCard from "../components/StatCard";

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
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
        // Reconnect after 5s if not intentionally closed
        setTimeout(connectWs, 5_000);
      };
    };

    connectWs();

    // Polling fallback every 30s (in case WS drops silently)
    const pollId = setInterval(load, 30_000);

    return () => {
      clearInterval(pollId);
      clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">
      {error}
    </div>
  );
  if (!data) return <Skeleton />;

  // Pie chart data — only non-null values
  const taskPieData = [
    { name: "Pending",     value: data.pending_tasks     },
    { name: "In Progress", value: data.in_progress_tasks },
    { name: "Completed",   value: data.completed_tasks   },
    { name: "New",         value: data.new_tasks         },
    { name: "Rejected",    value: data.rejected_tasks    },
  ].filter((d) => d.value != null && d.value > 0);

  // Bar chart for service calls — only when data is present
  const callBarData = data.active_calls != null ? [
    { name: "Unassigned", count: data.unassigned_calls ?? 0, fill: "#f59e0b" },
    { name: "Active",     count: data.active_calls      ?? 0, fill: "#3b82f6" },
    { name: "Escalated",  count: data.sla_risks         ?? 0, fill: "#ef4444" },
    { name: "Resolved",   count: data.resolved_calls    ?? 0, fill: "#10b981" },
  ] : [];

  const hasSlaRisk = (data.sla_risks ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live overview · refreshes every 15 s
            {data.scope && (
              <span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold capitalize">
                {data.scope.replace(/_/g, " ")}
              </span>
            )}
          </p>
        </div>
        {hasSlaRisk && (
          <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full font-semibold animate-pulse">
            ⚠ SLA Risk
          </span>
        )}
      </div>

      {/* ── TOP 4 STAT CARDS ── */}
      <section>
        <SectionTitle>Overview</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Tasks"
            value={data.total_tasks}
            sub={`${data.in_progress_tasks ?? 0} in progress`}
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
            color={data.pending_approvals != null ? "yellow" : "slate"}
            icon="⏳"
          />
          {data.expenses_pending != null && (
            <StatCard
              title="Expenses Pending"
              value={data.expenses_pending}
              sub="awaiting approval"
              color="orange"
              icon="💸"
            />
          )}
        </div>
      </section>

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
          {/* SLA alert box */}
          <div className={`rounded-xl border p-4 ${hasSlaRisk ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${hasSlaRisk ? "text-red-600" : "text-green-600"}`}>
                  SLA Risks
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
              <p className="text-xs text-green-600 mt-2">All service calls within SLA</p>
            )}
          </div>

          {/* Call bar chart (if role has access) */}
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

      {/* ── TASK BREAKDOWN STATS ── */}
      <section>
        <SectionTitle>Task Breakdown</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="New"            value={data.new_tasks}         color="slate"  icon="🆕" />
          <StatCard title="In Progress"    value={data.in_progress_tasks} color="blue"   icon="⚡" />
          <StatCard title="Pending Review" value={data.pending_tasks}     color="yellow" icon="⏳" />
          <StatCard title="Completed"      value={data.completed_tasks}   color="green"  icon="✅" />
        </div>
      </section>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
                  { name: "New",        fill: "#94a3b8" },
                  { name: "In Progress",fill: "#3b82f6" },
                  { name: "Review",     fill: "#f59e0b" },
                  { name: "Completed",  fill: "#10b981" },
                  { name: "Rejected",   fill: "#ef4444" },
                ].map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── QUICK LINK ── */}
      {data.pending_approvals > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {data.pending_approvals} item{data.pending_approvals !== 1 ? "s" : ""} waiting for your approval
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">Tasks, documents and expenses pending action</p>
          </div>
          <Link
            to="/approvals"
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex-shrink-0"
          >
            Review Now →
          </Link>
        </div>
      )}
    </div>
  );
}
