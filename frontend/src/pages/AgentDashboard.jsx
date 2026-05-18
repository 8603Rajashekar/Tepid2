import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const STATUS_STYLES = {
  new:            { bg: "bg-slate-100",   text: "text-slate-600" },
  assigned:       { bg: "bg-amber-100",   text: "text-amber-700" },
  in_progress:    { bg: "bg-blue-100",    text: "text-blue-700" },
  pending_review: { bg: "bg-purple-100",  text: "text-purple-700" },
  approved:       { bg: "bg-green-100",   text: "text-green-700" },
  rejected:       { bg: "bg-red-100",     text: "text-red-700" },
};

const PRIORITY_STYLES = {
  critical: { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  high:     { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  normal:   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  low:      { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
};

const NEXT_STATUS = {
  assigned: "in_progress", in_progress: "pending_review",
};

const NEXT_LABEL = {
  assigned: "Start Task", in_progress: "Submit for Review",
};

function TaskCard({ task, onAdvance, advancing }) {
  const ss = STATUS_STYLES[task.status] || STATUS_STYLES.new;
  const ps = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
  const nextStatus = NEXT_STATUS[task.status];

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-1 truncate">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ss.bg} ${ss.text}`}>
              {task.status.replace(/_/g, " ")}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ps.bg} ${ps.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
              {task.priority}
            </span>
            <span className="text-xs text-slate-400">
              Due {new Date(task.due_date).toLocaleDateString()}
            </span>
          </div>
          {task.rejection_reason && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              <span className="font-semibold">Rejected: </span>{task.rejection_reason}
            </div>
          )}
        </div>
        {nextStatus && (
          <button
            onClick={() => onAdvance(task)}
            disabled={advancing === task.id}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition
              ${task.status === "assigned"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white"}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {advancing === task.id ? "…" : NEXT_LABEL[task.status]}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, tasks, color, onAdvance, advancing }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3`}>
        <h2 className={`text-sm font-semibold ${color}`}>{title}</h2>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map(t => <TaskCard key={t.id} task={t} onAdvance={onAdvance} advancing={advancing} />)}
      </div>
    </div>
  );
}

export default function AgentDashboard({ onLogout }) {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [advancing, setAdvancing] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadTasks = () => {
    fetch(`${API}/tasks/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceStatus = async (task) => {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    setAdvancing(task.id);
    try {
      await fetch(`${API}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: next }),
      });
      loadTasks();
    } catch {
      alert("Failed to update status");
    } finally {
      setAdvancing(null);
    }
  };

  const active = tasks.filter(t => ["assigned", "in_progress"].includes(t.status));
  const review = tasks.filter(t => t.status === "pending_review");
  const done   = tasks.filter(t => ["approved", "rejected"].includes(t.status));

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
              <div className="text-xs text-slate-400">Agent Panel</div>
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-1">
          <div className="px-3 py-2 flex items-center justify-between text-sm text-slate-400">
            <span>Active</span>
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{active.length}</span>
          </div>
          <div className="px-3 py-2 flex items-center justify-between text-sm text-slate-400">
            <span>In Review</span>
            <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">{review.length}</span>
          </div>
          <div className="px-3 py-2 flex items-center justify-between text-sm text-slate-400">
            <span>Completed</span>
            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">{done.filter(t => t.status === "approved").length}</span>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-3 truncate">{user.full_name || user.email}</div>
          <button onClick={onLogout} className="w-full text-xs text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200 py-1.5 rounded-lg transition">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-800">My Tasks</h1>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="text-sm text-slate-400 text-center py-16">Loading your tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              <Section title="Active" tasks={active} color="text-blue-700" onAdvance={advanceStatus} advancing={advancing} />
              <Section title="Pending Review" tasks={review} color="text-purple-700" onAdvance={advanceStatus} advancing={advancing} />
              <Section title="Completed" tasks={done} color="text-slate-500" onAdvance={advanceStatus} advancing={advancing} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
