import { useEffect, useState } from "react";
import TaskTable from "../components/TaskTable";
import api from "../services/api";

export default function ApprovalQueue() {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [working, setWorking]     = useState(null);   // task id being acted on
  const [rejectId, setRejectId]   = useState(null);   // task id in reject flow
  const [reason, setReason]       = useState("");
  const [error, setError]         = useState("");

  const load = async () => {
    try {
      const res = await api.get("/tasks/");
      const pending = (Array.isArray(res.data) ? res.data : []).filter(
        (t) => t.status === "pending_review"
      );
      setTasks(pending);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setWorking(id);
    try {
      await api.post(`/tasks/${id}/approve`);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Approve failed");
    } finally {
      setWorking(null);
    }
  };

  const openReject = (id) => {
    setRejectId(id);
    setReason("");
    setError("");
  };

  const submitReject = async () => {
    if (!reason.trim()) { setError("Rejection reason is required"); return; }
    setWorking(rejectId);
    try {
      await api.post(`/tasks/${rejectId}/reject`, { rejection_reason: reason });
      setRejectId(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || "Reject failed");
    } finally {
      setWorking(null);
    }
  };

  const actions = (task) => (
    <div className="flex gap-2">
      <button
        onClick={() => approve(task.id)}
        disabled={working === task.id}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
      >
        {working === task.id ? "…" : "Approve"}
      </button>
      <button
        onClick={() => openReject(task.id)}
        disabled={!!working}
        className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
      >
        Reject
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Approval Queue</h1>
        <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
          {tasks.length} pending
        </span>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Reject reason panel */}
      {rejectId && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            Rejecting: <span className="font-normal">{tasks.find(t => t.id === rejectId)?.title}</span>
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason (required)…"
            rows={2}
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={submitReject}
              disabled={working === rejectId}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              {working === rejectId ? "Rejecting…" : "Confirm Reject"}
            </button>
            <button
              onClick={() => setRejectId(null)}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Tasks awaiting your review</h2>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-sm text-slate-400 text-center">Loading…</div>
        ) : (
          <TaskTable
            tasks={tasks}
            actions={actions}
            emptyText="No tasks pending review right now"
          />
        )}
      </div>
    </div>
  );
}
