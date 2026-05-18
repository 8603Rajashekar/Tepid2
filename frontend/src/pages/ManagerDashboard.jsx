import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const STATUS_COLORS = {
  new: "#94a3b8", assigned: "#f59e0b", in_progress: "#3b82f6",
  pending_review: "#8b5cf6", approved: "#22c55e", rejected: "#ef4444",
};

const PRIORITY_COLORS = { critical: "#ef4444", high: "#f97316", normal: "#3b82f6", low: "#94a3b8" };

export default function ManagerDashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks]           = useState([]);
  const [serviceCalls, setService]  = useState([]);
  const [overview, setOverview]     = useState(null);
  const [loading, setLoading]       = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/tasks/`, { headers }).then(r => r.json()),
      fetch(`${API}/service-calls/`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${API}/analytics/overview`, { headers }).then(r => r.json()),
    ]).then(([t, s, o]) => {
      setTasks(Array.isArray(t) ? t : []);
      setService(Array.isArray(s) ? s : []);
      setOverview(o.tasks || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const pendingReview = tasks.filter(t => t.status === "pending_review");
  const openCalls = serviceCalls.filter(c => c.status === "open");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#1e293b", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Field Ops</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Manager Panel</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>{user.full_name || user.email}</div>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #475569", color: "#94a3b8", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>Manager Dashboard</h1>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Tasks",     value: overview?.total ?? "—",        bg: "#eff6ff", color: "#1d4ed8" },
            { label: "Pending Review",  value: pendingReview.length,          bg: "#fdf4ff", color: "#7e22ce" },
            { label: "Approved",        value: overview?.approved ?? "—",     bg: "#f0fdf4", color: "#15803d" },
            { label: "Open Calls",      value: openCalls.length,              bg: "#fff7ed", color: "#c2410c" },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Pending Approval */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Tasks Pending Approval ({pendingReview.length})</div>
          {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : pendingReview.length === 0
            ? <div style={{ color: "#94a3b8" }}>No tasks awaiting review</div>
            : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Title", "Priority", "Due Date", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingReview.map(task => (
                    <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{task.title}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: PRIORITY_COLORS[task.priority] + "20", color: PRIORITY_COLORS[task.priority], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{new Date(task.due_date).toLocaleDateString()}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: STATUS_COLORS["pending_review"] + "20", color: STATUS_COLORS["pending_review"], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                          pending review
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>

        {/* Open Service Calls */}
        <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Open Service Calls ({openCalls.length})</div>
          {openCalls.length === 0
            ? <div style={{ color: "#94a3b8" }}>No open service calls</div>
            : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Customer", "Phone", "Issue", "Created"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openCalls.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{c.customer_name}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{c.customer_phone}</td>
                      <td style={{ padding: "10px 12px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.issue_description}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  );
}
