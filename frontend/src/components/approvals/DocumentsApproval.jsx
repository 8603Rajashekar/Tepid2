import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import ApprovalModal from "./ApprovalModal";
import ApprovalHistory from "./ApprovalHistory";

const STATUS_BADGE = {
  review:  "bg-blue-100   text-blue-700",
  signing: "bg-purple-100 text-purple-700",
};

export default function DocumentsApproval() {
  const toast = useToast();

  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null);
  const [modal,    setModal]    = useState(null);   // { refId, action, label }
  const [historyId, setHistoryId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/documents/");
      setDocs(res.data.filter((d) => d.status === "review" || d.status === "signing"));
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // "Send for Signing" is a workflow step, not an approval — keep as direct call
  const sendForSigning = async (docId) => {
    setActing(docId);
    try {
      await api.post(`/documents/${docId}/signing`);
      toast.success("Sent for e-sign");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally { setActing(null); }
  };

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );

  if (docs.length === 0) return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">📄</p>
      <p className="text-slate-600 font-medium text-sm">No documents pending</p>
      <p className="text-slate-400 text-xs mt-1">All documents are up to date</p>
    </div>
  );

  return (
    <>
      {modal && (
        <ApprovalModal
          module="document"
          refId={modal.refId}
          action={modal.action}
          label={modal.label}
          onSuccess={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <a href={d.file_url} target="_blank" rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline truncate block">
                  {d.name}
                </a>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_BADGE[d.status] || "bg-slate-100 text-slate-500"}`}>
                {d.status === "signing" ? "E-Sign Pending" : d.status}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {d.status === "review" && (
                <button
                  onClick={() => sendForSigning(d.id)}
                  disabled={acting === d.id}
                  className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition font-semibold disabled:opacity-50"
                >
                  {acting === d.id ? "…" : "Send for E-Sign"}
                </button>
              )}
              <button
                onClick={() => setModal({ refId: d.id, action: "approved", label: d.name })}
                className="flex-1 bg-green-50 text-green-700 border border-green-200 text-xs px-3 py-2 rounded-lg hover:bg-green-100 transition font-semibold"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setModal({ refId: d.id, action: "rejected", label: d.name })}
                className="flex-1 bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-2 rounded-lg hover:bg-red-100 transition font-semibold"
              >
                ✕ Reject
              </button>
              <button
                onClick={() => setHistoryId(historyId === d.id ? null : d.id)}
                className="bg-slate-100 text-slate-500 border border-slate-200 text-xs px-3 py-2 rounded-lg hover:bg-slate-200 transition"
                title="Approval history"
              >
                {historyId === d.id ? "Hide" : "History"}
              </button>
            </div>

            {historyId === d.id && (
              <div className="mt-3">
                <ApprovalHistory module="document" refId={d.id} onClose={() => setHistoryId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
