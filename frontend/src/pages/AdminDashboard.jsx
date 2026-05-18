import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import MapView from "../components/MapView";
import useTracking from "../hooks/useTracking";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const STATUS_COLORS = {
  new: "#94a3b8", assigned: "#f59e0b", in_progress: "#3b82f6",
  pending_review: "#8b5cf6", approved: "#22c55e", rejected: "#ef4444",
};

const NAV_ITEMS = ["Overview", "Agents", "Service Calls", "Map"];

export default function AdminDashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const { locations, paths, colors, connected } = useTracking(token);
  const [overview, setOverview]    = useState(null);
  const [agents, setAgents]        = useState([]);
  const [serviceCalls, setService] = useState(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const load = () => {
      fetch(`${API}/analytics/overview`, { headers }).then(r => r.json()).then(d => setOverview(d.tasks)).catch(() => {});
      fetch(`${API}/analytics/agent-performance`, { headers }).then(r => r.json()).then(d => setAgents(d.agent_performance || [])).catch(() => {});
      fetch(`${API}/analytics/service-calls`, { headers }).then(r => r.json()).then(d => setService(d.service_calls)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [token]);

  const pieData = overview
    ? Object.entries(overview).filter(([k]) => k !== "total").map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    : [];

  const agentChartData = agents.slice(0, 8).map(a => ({
    name: a.agent_id.slice(0, 8),
    tasks: a.total_tasks,
    approved: a.approved,
  }));

  const kpis = [
    { label: "Total Tasks",   value: overview?.total ?? "—",       cls: "bg-blue-50 text-blue-700",   icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "In Progress",   value: overview?.in_progress ?? "—", cls: "bg-yellow-50 text-yellow-700", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Approved",      value: overview?.approved ?? "—",    cls: "bg-green-50 text-green-700",  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Service Calls", value: serviceCalls?.total ?? "—",   cls: "bg-purple-50 text-purple-700", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Field Ops</div>
              <div className="text-xs text-slate-400">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <div key={item} className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition">
              {item}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-3 truncate">{user.full_name || user.email}</div>
          <button
            onClick={onLogout}
            className="w-full text-xs text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200 py-1.5 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {connected ? "● Live" : "● Offline"}
          </span>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map(card => (
              <div key={card.label} className={`rounded-xl p-5 ${card.cls.split(" ")[0]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{card.label}</p>
                    <p className={`text-3xl font-bold ${card.cls.split(" ")[1]}`}>{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.cls.split(" ")[0]}`}>
                    <svg className={`w-5 h-5 ${card.cls.split(" ")[1]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status Breakdown</h3>
              {pieData.length > 0 ? (
                <PieChart width={300} height={200}>
                  <Pie data={pieData} cx={150} cy={90} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                    {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Agent Performance</h3>
              {agentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="tasks" fill="#3b82f6" name="Total" radius={[4,4,0,0]} />
                    <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              )}
            </div>
          </div>

          {/* Live Map */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Live Agent Map
              <span className="ml-2 text-xs font-normal text-slate-400">({Object.keys(locations).length} agents)</span>
            </h3>
            <MapView
              locations={Object.values(locations)}
              paths={paths}
              colors={colors}
              style={{ height: 340, borderRadius: 8 }}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
