import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";
import ApprovalModal from "./ApprovalModal";
import ApprovalHistory from "./ApprovalHistory";

const STATUS_LABEL = {
  submitted:           { text: "Awaiting Finance",     cls: "bg-yellow-100 text-yellow-700" },
  supervisor_approved: { text: "Awaiting Finance",     cls: "bg-blue-100   text-blue-700"   },
  finance_approved:    { text: "Awaiting Admin",       cls: "bg-purple-100 text-purple-700" },
  admin_approved:      { text: "Approved — Reimburse", cls: "bg-green-100  text-green-700"  },
};

export default function ExpensesApproval() {
  const toast = useToast();
  const role  = localStorage.getItem("role") || "";

  const isFinance = role === "finance" || role === "finance_officer";
  const isAdmin   = role === "admin"   || role === "super_admin";

  // Supervisor is read-only — no approval stage assigned
  const myStage = isAdmin ? "finance_approved" : isFinance ? "submitted" : null;

  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);   // { expId, action, label, endpoint }
  const [historyId, setHistoryId] = useState(null);

  const load = useCallback(async () => {
    if (!myStage) { setLoading(false); return; }
    try {
      const res = await api.get("/expenses/");
      // Finance sees both submitted and supervisor_approved; admin sees finance_approved
      const pending = isFinance
        ? res.data.filter((e) => ["submitted", "supervisor_approved"].includes(e.status))
        : res.data.filter((e) => e.status === myStage);
      setExpenses(pending);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [toast, myStage, isFinance]);

  useEffect(() => { load(); }, [load]);

  if (!myStage) return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">👁️</p>
      <p className="text-slate-600 font-medium text-sm">Read-only access</p>
      <p className="text-slate-400 text-xs mt-1">Supervisors can view expenses on the Expenses page but do not approve them</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );

  const stageLabel = isAdmin ? "awaiting your final approval" : "awaiting finance validation";

  if (expenses.length === 0) return (
    <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">💰</p>
      <p className="text-slate-600 font-medium text-sm">No expenses pending</p>
      <p className="text-slate-400 text-xs mt-1">Nothing {stageLabel}</p>
    </div>
  );

  return (
    <>
      {modal && (
        <ApprovalModal
          module="expense"
          refId={modal.expId}
          action={modal.action}
          label={modal.label}
          endpoint={modal.endpoint}
          onSuccess={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-3">
        {expenses.map((ex) => {
          const badge    = STATUS_LABEL[ex.status] || { text: ex.status, cls: "bg-slate-100 text-slate-600" };
          const amt      = `₹${parseFloat(ex.amount).toLocaleString()}`;
          const expLabel = `${ex.title} (${amt})`;

          const showFinance = ["submitted", "supervisor_approved"].includes(ex.status) && isFinance;
          const showAdmin   = ex.status === "finance_approved" && isAdmin;

          const approveEndpoint =
            showFinance ? `/expenses/${ex.id}/finance`       :
            showAdmin   ? `/expenses/${ex.id}/admin-approve` : null;

          const openApprove = () => setModal({
            expId:    ex.id,
            action:   "approved",
            label:    expLabel,
            endpoint: approveEndpoint,
          });

          const openReject = () => setModal({
            expId:    ex.id,
            action:   "rejected",
            label:    expLabel,
            endpoint: `/expenses/${ex.id}/reject`,
          });

          return (
            <div key={ex.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">

              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{ex.title}</p>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">{ex.category}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-slate-700 text-sm">{amt}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
              </div>

              {ex.description && (
                <p className="text-xs text-slate-500 mb-2 bg-slate-50 rounded-lg px-3 py-1.5">{ex.description}</p>
              )}

              {/* Supporting document */}
              {ex.receipt_url ? (
                <a
                  href={ex.receipt_url.startsWith("/uploads")
                    ? `${process.env.REACT_APP_API_URL}${ex.receipt_url}`
                    : ex.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-3 font-medium"
                >
                  📎 View Supporting Document
                </a>
              ) : (
                parseFloat(ex.amount) > 999 && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mb-3">
                    ⚠ No document attached (amount &gt; ₹1,000)
                  </p>
                )
              )}

              {/* Flow indicator */}
              <div className="flex items-center gap-1 mb-3 text-xs text-slate-400">
                <span className={ex.status === "submitted" ? "text-blue-600 font-semibold" : "text-green-500"}>
                  {ex.status === "submitted" ? "① Finance" : "✓ Finance"}
                </span>
                <span>→</span>
                <span className={ex.status === "finance_approved" ? "text-purple-600 font-semibold" : ""}>
                  ② Admin
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {showFinance && (<>
                  <button onClick={openApprove}
                    className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-2 rounded-lg hover:bg-blue-100 transition font-semibold">
                    ✓ Validate
                  </button>
                  <button onClick={openReject}
                    className="flex-1 bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-2 rounded-lg hover:bg-red-100 transition font-semibold">
                    ✕ Reject
                  </button>
                </>)}

                {showAdmin && (<>
                  <button onClick={openApprove}
                    className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs px-3 py-2 rounded-lg hover:bg-purple-100 transition font-semibold">
                    ✓ Final Approve
                  </button>
                  <button onClick={openReject}
                    className="flex-1 bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-2 rounded-lg hover:bg-red-100 transition font-semibold">
                    ✕ Reject
                  </button>
                </>)}

                <button
                  onClick={() => setHistoryId(historyId === ex.id ? null : ex.id)}
                  className="bg-slate-100 text-slate-500 border border-slate-200 text-xs px-3 py-2 rounded-lg hover:bg-slate-200 transition">
                  {historyId === ex.id ? "Hide" : "History"}
                </button>
              </div>

              {historyId === ex.id && (
                <div className="mt-3">
                  <ApprovalHistory module="expense" refId={ex.id} onClose={() => setHistoryId(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
