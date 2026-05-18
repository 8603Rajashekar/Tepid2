import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const STATUS_COLORS = {
  new: "#94a3b8", assigned: "#f59e0b", in_progress: "#3b82f6",
  pending_review: "#8b5cf6", approved: "#22c55e", rejected: "#ef4444",
};

const PRIORITY_COLORS = { critical: "#ef4444", high: "#f97316", normal: "#3b82f6", low: "#94a3b8" };

const NEXT_STATUS = {
  new: null, assigned: "in_progress", in_progress: "pending_review", pending_review: null, approved: null, rejected: null,
};

const NEXT_LABEL = { assigned: "Start", in_progress: "Submit for Review" };

export default function AgentDashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadTasks = () => {
    fetch(`${API}/tasks/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, [token]);

  const advanceStatus = async (task) => {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    setUpdating(task.id);
    try {
      await fetch(`${API}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: next }),
      });
      loadTasks();
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const active  = tasks.filter(t => ["assigned", "in_progress"].includes(t.status));
  const review  = tasks.filter(t => t.status === "pending_review");
  const done    = tasks.filter(t => ["approved", "rejected"].includes(t.status));

  const TaskCard = ({ task }) => (
    <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
          {task.description && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{task.description}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: STATUS_COLORS[task.status] + "20", color: STATUS_COLORS[task.status], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
              {task.status.replace("_", " ")}
            </span>
            <span style={{ background: PRIORITY_COLORS[task.priority] + "20", color: PRIORITY_COLORS[task.priority], padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
              {task.priority}
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Due: {new Date(task.due_date).toLocaleDateString()}</span>
          </div>
          {task.rejection_reason && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
              Rejected: {task.rejection_reason}
            </div>
          )}
        </div>
        {NEXT_STATUS[task.status] && (
          <button
            onClick={() => advanceStatus(task)}
            disabled={updating === task.id}
            style={{
              marginLeft: 16, padding: "8px 16px", background: "#3b82f6", color: "white",
              border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
              opacity: updating === task.id ? 0.6 : 1,
            }}
          >
            {updating === task.id ? "…" : NEXT_LABEL[task.status]}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#1e293b", color: "white", padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Field Ops</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Agent Panel</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ padding: "8px 12px", fontSize: 13, color: "#94a3b8" }}>Active: {active.length}</div>
          <div style={{ padding: "8px 12px", fontSize: 13, color: "#94a3b8" }}>In Review: {review.length}</div>
          <div style={{ padding: "8px 12px", fontSize: 13, color: "#94a3b8" }}>Completed: {done.filter(t => t.status === "approved").length}</div>
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>{user.full_name || user.email}</div>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #475569", color: "#94a3b8", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>My Tasks</h1>

        {loading ? <div style={{ color: "#94a3b8" }}>Loading…</div> : (
          <>
            {active.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: "#374151" }}>Active ({active.length})</div>
                {active.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            )}

            {review.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: "#7e22ce" }}>Pending Review ({review.length})</div>
                {review.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            )}

            {done.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 12, color: "#64748b" }}>Completed ({done.length})</div>
                {done.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            )}

            {tasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>No tasks assigned yet</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
