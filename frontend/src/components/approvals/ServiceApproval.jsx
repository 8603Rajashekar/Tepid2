import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import ApprovalModal from "./ApprovalModal";
import ApprovalHistory from "./ApprovalHistory";

const PRIORITY_COLOR = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high:     "text-orange-600 bg-orange-50 border-orange-200",
  medium:   "text-yellow-600 bg-yellow-50 border-yellow-200",
  low:      "text-green-600 bg-green-50 border-green-200",
};

export default function ServiceApproval() {
  const toast = useToast();

  const [calls,     setCalls]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);   // { refId, action, label }
  const [historyId, setHistoryId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/service-calls/");
      setCalls(res.data.filter((c) => c.status === "resolved"));
    } catch {
      toast.error("Failed to load service calls");
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

  if (calls.length === 0) return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">📞</p>
      <p className="text-slate-600 font-medium text-sm">No closures pending</p>
      <p className="text-slate-400 text-xs mt-1">All resolved calls have been closed</p>
    </div>
  );

  return (
    <>
      {modal && (
        <ApprovalModal
          module="service_call"
          refId={modal.refId}
          action={modal.action}
          label={modal.label}
          onSuccess={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-3">
        {calls.map((c) => (
          <div key={c.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                {c.resolution_notes && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">Notes: {c.resolution_notes}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.low}`}>
                {c.priority}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Resolved</span>
              {c.resolved_at && (
                <span>Resolved: {new Date(c.resolved_at).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModal({ refId: c.id, action: "approved", label: c.title })}
                className="flex-1 bg-slate-700 text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition font-semibold"
              >
                ✓ Close Call
              </button>
              <button
                onClick={() => setModal({ refId: c.id, action: "escalated", label: c.title })}
                className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 text-xs px-3 py-2 rounded-lg hover:bg-orange-100 transition font-semibold"
              >
                ⬆ Escalate
              </button>
              <button
                onClick={() => setHistoryId(historyId === c.id ? null : c.id)}
                className="bg-slate-100 text-slate-500 border border-slate-200 text-xs px-3 py-2 rounded-lg hover:bg-slate-200 transition"
                title="Approval history"
              >
                {historyId === c.id ? "Hide" : "History"}
              </button>
            </div>

            {historyId === c.id && (
              <div className="mt-3">
                <ApprovalHistory module="service_call" refId={c.id} onClose={() => setHistoryId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
