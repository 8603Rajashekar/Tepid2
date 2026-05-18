import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import MapView from "../components/MapView";
import useTracking from "../hooks/useTracking";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;
const STATUS_COLORS = {
  new: "#94a3b8", assigned: "#f59e0b", in_progress: "#3b82f6",
  pending_review: "#8b5cf6", approved: "#22c55e", rejected: "#ef4444",
};

export default function AdminDashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const { locations, paths, colors, connected } = useTracking(token);
  const [overview, setOverview]     = useState(null);
  const [agents, setAgents]         = useState([]);
  const [serviceCalls, setService]  = useState(null);

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
    ? Object.entries(overview).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    : [];

  const agentChartData = agents.slice(0, 8).map(a => ({
    name: a.agent_id.slice(0, 8),
    tasks: a.total_tasks,
    approved: a.approved,
  }));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#1e293b", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Field Ops</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1 }}>
          {["Overview", "Agents", "Service Calls", "Map"].map(item => (
            <div key={item} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 4, fontSize: 14, color: "#cbd5e1", cursor: "pointer" }}>
              {item}
            </div>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>{user.full_name || user.email}</div>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #475569", color: "#94a3b8", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h1>
          <span style={{ background: connected ? "#dcfce7" : "#fee2e2", color: connected ? "#16a34a" : "#dc2626", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Tasks",    value: overview?.total ?? "—",        bg: "#eff6ff", color: "#1d4ed8" },
            { label: "In Progress",    value: overview?.in_progress ?? "—",  bg: "#fefce8", color: "#a16207" },
            { label: "Approved",       value: overview?.approved ?? "—",     bg: "#f0fdf4", color: "#15803d" },
            { label: "Service Calls",  value: serviceCalls?.total ?? "—",    bg: "#fdf4ff", color: "#7e22ce" },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Task Status Breakdown</div>
            {pieData.length > 0 ? (
              <PieChart width={280} height={200}>
                <Pie data={pieData} cx={140} cy={90} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : <div style={{ color: "#94a3b8", textAlign: "center", paddingTop: 60 }}>No data</div>}
          </div>

          <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Agent Performance</div>
            {agentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tasks" fill="#3b82f6" name="Total" />
                  <Bar dataKey="approved" fill="#22c55e" name="Approved" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ color: "#94a3b8", textAlign: "center", paddingTop: 60 }}>No data</div>}
          </div>
        </div>

        {/* Live Map */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Live Agent Map ({Object.keys(locations).length} agents)</div>
          <MapView locations={Object.values(locations)} paths={paths} colors={colors} style={{ height: 340, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
