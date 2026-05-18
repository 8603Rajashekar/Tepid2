import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import MapView from "../components/MapView";
import useTracking from "../hooks/useTracking";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const PIE_COLORS = { pending: "#f97316", in_progress: "#3b82f6", completed: "#22c55e" };

export default function Dashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const { locations, paths, colors, connected } = useTracking(token);
  const [stats, setStats] = useState(null);

  const agents = Object.values(locations);

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchStats = () =>
      fetch(`${API}/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setStats)
        .catch(console.error);

    fetchStats();
    const id = setInterval(fetchStats, 10000);
    return () => clearInterval(id);
  }, [token]);

  const pieData = stats
    ? [
        { name: "Pending", value: stats.pending },
        { name: "In Progress", value: stats.in_progress },
        { name: "Completed", value: stats.completed },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Sidebar */}
      <div style={{
        width: 280, background: "#0f172a", color: "#f1f5f9",
        display: "flex", flexDirection: "column", flexShrink: 0,
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Field Ops</div>
          <div style={{
            display: "inline-block", padding: "2px 10px", borderRadius: 20,
            fontSize: 12, fontWeight: 600,
            background: connected ? "#166534" : "#7f1d1d",
            color: connected ? "#bbf7d0" : "#fecaca",
          }}>
            {connected ? "Live" : "Disconnected"}
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
            }}>
              Task Overview
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Total", value: stats.total, color: "#94a3b8" },
                { label: "Pending", value: stats.pending, color: "#f97316" },
                { label: "In Progress", value: stats.in_progress, color: "#3b82f6" },
                { label: "Completed", value: stats.completed, color: "#22c55e" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: "#1e293b", borderRadius: 6, padding: "6px 10px",
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {stats.location_pings} location ping{stats.location_pings !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
            }}>
              Status Breakdown
            </div>
            <PieChart width={248} height={180}>
              <Pie
                data={pieData}
                cx={124}
                cy={80}
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PIE_COLORS[entry.name.toLowerCase().replace(" ", "_")] || "#64748b"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#f1f5f9" }}
                itemStyle={{ color: "#94a3b8" }}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
              />
            </PieChart>
          </div>
        )}

        {/* Agent list */}
        <div style={{ padding: "12px 16px", flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10,
          }}>
            Active Agents ({agents.length})
          </div>

          {agents.length === 0 ? (
            <div style={{ fontSize: 13, color: "#475569" }}>No agents online yet</div>
          ) : (
            agents.map((loc) => (
              <div key={loc.user_id} style={{
                background: "#1e293b", borderRadius: 8,
                padding: "10px 12px", marginBottom: 8,
                borderLeft: `3px solid ${colors[loc.user_id] || "#3b82f6"}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Agent {loc.user_id.slice(0, 8)}…
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                  Task: {loc.task_id ? loc.task_id.slice(0, 8) + "…" : "—"}<br />
                  Status: {loc.status || "—"}<br />
                  Lat: {loc.latitude.toFixed(5)}<br />
                  Lng: {loc.longitude.toFixed(5)}<br />
                  <span style={{ color: "#64748b" }}>
                    {(paths[loc.user_id] || []).length} point(s) recorded
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "8px 0", background: "#1e293b",
              color: "#f1f5f9", border: "1px solid #334155", borderRadius: 8,
              fontSize: 13, cursor: "pointer", fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapView locations={locations} paths={paths} colors={colors} />
      </div>

    </div>
  );
}
