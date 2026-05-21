import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import ApprovalModal from "./ApprovalModal";
import ApprovalHistory from "./ApprovalHistory";

function PriorityDot({ priority }) {
  const COLOR = { critical: "bg-red-500", high: "bg-orange-400", normal: "bg-slate-300", low: "bg-green-400" };
  const LABEL = { critical: "text-red-600", high: "text-orange-500", normal: "text-slate-500", low: "text-green-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase ${LABEL[priority] || LABEL.normal}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${COLOR[priority] || COLOR.normal}`} />
      {priority}
    </span>
  );
}

export default function TasksApproval() {
  const toast = useToast();

  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);   // { refId, action, label }
  const [historyId, setHistoryId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/tasks/");
      setTasks(res.data.filter((t) => t.status === "pending_review"));
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );

  if (tasks.length === 0) return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">🎉</p>
      <p className="text-slate-600 font-medium text-sm">All tasks approved</p>
      <p className="text-slate-400 text-xs mt-1">No tasks pending review</p>
    </div>
  );

  return (
    <>
      {modal && (
        <ApprovalModal
          module="task"
          refId={modal.refId}
          action={modal.action}
          label={modal.label}
          onSuccess={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                {t.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.description}</p>}
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-700 flex-shrink-0">
                Pending Review
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
              <PriorityDot priority={t.priority} />
              {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
              {t.efficiency_score != null && (
                <span className="text-green-600 font-semibold">Score: {t.efficiency_score}</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModal({ refId: t.id, action: "approved", label: t.title })}
                className="flex-1 bg-green-50 text-green-700 border border-green-200 text-xs px-3 py-2 rounded-lg hover:bg-green-100 transition font-semibold"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setModal({ refId: t.id, action: "rejected", label: t.title })}
                className="flex-1 bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-2 rounded-lg hover:bg-red-100 transition font-semibold"
              >
                ✕ Reject
              </button>
              <button
                onClick={() => setHistoryId(historyId === t.id ? null : t.id)}
                className="bg-slate-100 text-slate-500 border border-slate-200 text-xs px-3 py-2 rounded-lg hover:bg-slate-200 transition"
                title="View approval history"
              >
                {historyId === t.id ? "Hide" : "History"}
              </button>
            </div>

            {historyId === t.id && (
              <div className="mt-3">
                <ApprovalHistory module="task" refId={t.id} onClose={() => setHistoryId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
