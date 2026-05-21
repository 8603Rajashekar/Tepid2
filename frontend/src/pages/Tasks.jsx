import { useEffect, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

const STATUS_COLOR = {
  new:            "bg-slate-100 text-slate-600",
  assigned:       "bg-blue-100 text-blue-700",
  in_progress:    "bg-indigo-100 text-indigo-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved:       "bg-green-100 text-green-700",
  rejected:       "bg-red-100 text-red-700",
};

const PRIORITY_COLOR = {
  critical: "text-red-600",
  high:     "text-orange-500",
  normal:   "text-slate-600",
  low:      "text-green-600",
};

function Badge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] || "bg-slate-100 text-slate-500"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export default function Tasks() {
  const toast      = useToast();
  const role       = localStorage.getItem("role") || "";
  const canManage  = ["admin", "super_admin", "supervisor"].includes(role);
  const canApprove = ["admin", "super_admin", "supervisor"].includes(role);

  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [rejectId,     setRejectId]     = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [acting,       setActing]       = useState(null); // eslint-disable-line no-unused-vars
  const [form,         setForm]         = useState({ title: "", description: "", priority: "normal", due_date: "" });

  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks/");
      setTasks(res.data);
      setError(null);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const ACTION_MSG = {
    start:   "Task started",
    submit:  "Submitted for review",
    approve: "Task approved",
    assign:  "Task assigned",
  };

  const act = async (endpoint, body = null) => {
    setActing(endpoint);
    try {
      await (body ? api.post(endpoint, body) : api.post(endpoint));
      const key = Object.keys(ACTION_MSG).find((k) => endpoint.includes(k));
      toast.success(key ? ACTION_MSG[key] : "Done");
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    } finally {
      setActing(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tasks/", form);
      setForm({ title: "", description: "", priority: "normal", due_date: "" });
      setShowCreate(false);
      fetchTasks();
    } catch (e) {
      setError(e.response?.data?.detail || "Create failed");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await act(`/tasks/${rejectId}/reject`, { rejection_reason: rejectReason });
    setRejectId(null);
    setRejectReason("");
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-32 bg-slate-200 rounded" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
        {canManage && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + New Task
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700">Create Task</h2>
          <input required placeholder="Title (min 5 chars)" minLength={5}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description" rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {["critical", "high", "normal", "low"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <input required type="datetime-local"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-slate-800 mb-3">Rejection Reason</h2>
            <textarea rows={3} placeholder="Why is this task rejected?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReject} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition">Reject</button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 && <p className="text-slate-400 text-sm text-center py-10 bg-white rounded-xl border border-slate-200">No tasks found</p>}
        {tasks.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                {t.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                <Badge status={t.status} />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
              {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
              {t.efficiency_score != null && <span className="text-green-600 font-medium">Score: {t.efficiency_score}</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {t.status === "new" && canManage && (
                  <ActionBtn
                    color="blue"
                    loading={acting === `/tasks/${t.id}/assign`}
                    onClick={() => act(`/tasks/${t.id}/assign`, { assigned_to: JSON.parse(localStorage.getItem("user") || "{}").id })}
                  >
                    Assign to Me
                  </ActionBtn>
                )}
                {t.status === "assigned" && (
                <ActionBtn color="indigo" loading={acting === `/tasks/${t.id}/start`} onClick={() => act(`/tasks/${t.id}/start`)}>Start</ActionBtn>
              )}
              {t.status === "in_progress" && (
                <ActionBtn color="yellow" loading={acting === `/tasks/${t.id}/submit`} onClick={() => act(`/tasks/${t.id}/submit`)}>Submit for Review</ActionBtn>
              )}
              {t.status === "pending_review" && canApprove && (<>
                <ActionBtn color="green" loading={acting === `/tasks/${t.id}/approve`} onClick={() => act(`/tasks/${t.id}/approve`)}>Approve</ActionBtn>
                <ActionBtn color="red"   onClick={() => setRejectId(t.id)}>Reject</ActionBtn>
              </>)}
              {t.rejection_reason && (
                <span className="text-xs text-red-500 italic">Rejected: {t.rejection_reason}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBtn({ color, children, onClick, loading }) {
  const c = {
    blue:   "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-md border font-medium transition disabled:opacity-50 ${c[color]}`}
    >
      {loading ? "..." : children}
    </button>
  );
}
