import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import ApprovalHistory from "../components/approvals/ApprovalHistory";
import ApprovalModal from "../components/approvals/ApprovalModal";

const STATUS_BADGE = {
  draft:               "bg-slate-100 text-slate-600",
  submitted:           "bg-yellow-100 text-yellow-700",
  supervisor_approved: "bg-blue-100 text-blue-700",
  finance_approved:    "bg-purple-100 text-purple-700",
  admin_approved:      "bg-green-100 text-green-700",
  rejected:            "bg-red-100 text-red-700",
  reimbursed:          "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL = {
  draft:               "Draft",
  submitted:           "Submitted",
  supervisor_approved: "Supervisor Approved",
  finance_approved:    "Finance Approved",
  admin_approved:      "Admin Approved",
  rejected:            "Rejected",
  reimbursed:          "Reimbursed",
};

const CATEGORIES = ["travel", "meals", "equipment", "software", "accommodation", "fuel", "other"];

function Badge({ status }) {
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_BADGE[status] || "bg-slate-100 text-slate-500"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-32 bg-slate-200 rounded" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );
}

export default function Expenses() {
  const role         = localStorage.getItem("role") || "";
  const isSupervisor = role === "supervisor";
  const isFinance    = role === "finance" || role === "finance_officer";
  const isAdmin      = role === "admin" || role === "super_admin";
  const canSeeAll    = isAdmin || isSupervisor || isFinance;

  const toast    = useToast();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const fileRef  = useRef(null);

  const [expenses,     setExpenses]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [acting,       setActing]       = useState(null);
  const [historyId,    setHistoryId]    = useState(null);
  const [receiptFile,  setReceiptFile]  = useState(null);
  const [approvalModal,setApprovalModal]= useState(null); // { expId, action, label, endpoint }
  const [form,         setForm]         = useState({
    title: "", category: "other", amount: "", currency: "USD", description: "",
  });

  const amountNum       = parseFloat(form.amount) || 0;
  const receiptRequired = amountNum > 999;

  const load = useCallback(async () => {
    try {
      const endpoint = canSeeAll ? "/expenses/" : "/expenses/my";
      const res = await api.get(endpoint);
      setExpenses(res.data);
      setError(null);
    } catch {
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [canSeeAll]);

  useEffect(() => { load(); }, [load]);

  const act = async (endpoint, body = null, successMsg = "Done") => {
    setActing(endpoint);
    try {
      await (body ? api.post(endpoint, body) : api.post(endpoint));
      toast.success(successMsg);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    } finally {
      setActing(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (receiptRequired && !receiptFile) {
      toast.error("A supporting document is required for expenses above ₹999");
      return;
    }
    try {
      const res = await api.post("/expenses/", { ...form, amount: parseFloat(form.amount) });
      const expenseId = res.data.id;

      if (receiptFile) {
        const fd = new FormData();
        fd.append("file", receiptFile);
        await api.post(`/expenses/${expenseId}/receipt`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setForm({ title: "", category: "other", amount: "", currency: "USD", description: "" });
      setReceiptFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowCreate(false);
      toast.success("Expense created");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Create failed");
    }
  };

  // Stats
  const totalAmount = expenses
    .filter((e) => ["admin_approved", "reimbursed"].includes(e.status))
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const pendingCount = expenses.filter((e) =>
    ["submitted", "supervisor_approved", "finance_approved"].includes(e.status)
  ).length;
  const pendingAmount = expenses
    .filter((e) => ["submitted", "supervisor_approved", "finance_approved"].includes(e.status))
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expenses</h1>
          <p className="text-xs text-slate-400 mt-0.5">Submit → Finance → Admin → Reimbursed</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          + New Expense
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Summary strip */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{expenses.length}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-yellow-800 mt-0.5">{pendingCount}</p>
            {pendingAmount > 0 && (
              <p className="text-xs text-yellow-600 mt-0.5">₹{pendingAmount.toLocaleString()}</p>
            )}
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Approved (₹)</p>
            <p className="text-2xl font-bold text-green-800 mt-0.5">₹{totalAmount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700">New Expense</h2>
          <input required placeholder="Title"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input required type="number" min="0.01" step="0.01" placeholder="Amount"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <textarea rows={2} placeholder="Description (optional)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* Receipt / Document */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Supporting Document
              {receiptRequired
                ? <span className="ml-1 text-red-500 font-semibold">* Required (amount &gt; ₹999)</span>
                : <span className="ml-1 text-slate-400 font-normal">(optional)</span>
              }
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.zip,.txt"
              onChange={(e) => setReceiptFile(e.target.files[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {receiptFile && (
              <p className="text-xs text-green-600 mt-1">✓ {receiptFile.name}</p>
            )}
            {receiptRequired && !receiptFile && (
              <p className="text-xs text-red-500 mt-1">Please attach a receipt or invoice</p>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">Create</button>
            <button type="button" onClick={() => { setShowCreate(false); setReceiptFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Approval / Reject modal with digital signature */}
      {approvalModal && (
        <ApprovalModal
          module="expense"
          refId={approvalModal.expId}
          action={approvalModal.action}
          label={approvalModal.label}
          endpoint={approvalModal.endpoint}
          onSuccess={() => { setApprovalModal(null); load(); }}
          onClose={() => setApprovalModal(null)}
        />
      )}

      {/* Expense list */}
      {expenses.length === 0
        ? <div className="text-center py-14 bg-white rounded-xl border border-slate-200">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-slate-400 text-sm">No expenses yet</p>
          </div>
        : (
          <div className="space-y-3">
            {expenses.map((ex) => (
              <div key={ex.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{ex.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{ex.category}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-slate-700">₹{parseFloat(ex.amount).toLocaleString()}</span>
                    <Badge status={ex.status} />
                  </div>
                </div>

                {ex.description && <p className="text-xs text-slate-500 mb-2">{ex.description}</p>}

                {/* Receipt / document link */}
                {ex.receipt_url && (
                  <a
                    href={ex.receipt_url.startsWith("/uploads")
                      ? `${process.env.REACT_APP_API_URL}${ex.receipt_url}`
                      : ex.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                  >
                    📎 View Receipt
                  </a>
                )}

                {ex.rejection_reason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs text-red-700 mb-2">
                    <span className="font-semibold">Rejected:</span> {ex.rejection_reason}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {ex.status === "draft" && (
                    <Btn color="blue" loading={acting === `/expenses/${ex.id}/submit`}
                      onClick={() => act(`/expenses/${ex.id}/submit`, null, "Expense submitted for approval")}>
                      Submit
                    </Btn>
                  )}
                  {["submitted", "supervisor_approved"].includes(ex.status) && isFinance && (
                    <>
                      <Btn color="green"
                        onClick={() => setApprovalModal({
                          expId: ex.id, action: "approved",
                          label: `${ex.title} (₹${parseFloat(ex.amount).toLocaleString()})`,
                          endpoint: `/expenses/${ex.id}/finance`,
                        })}>
                        ✓ Finance Validate
                      </Btn>
                      <Btn color="red"
                        onClick={() => setApprovalModal({
                          expId: ex.id, action: "rejected",
                          label: `${ex.title} (₹${parseFloat(ex.amount).toLocaleString()})`,
                          endpoint: `/expenses/${ex.id}/reject`,
                        })}>
                        ✕ Reject
                      </Btn>
                    </>
                  )}
                  {ex.status === "finance_approved" && isAdmin && (
                    <>
                      <Btn color="purple"
                        onClick={() => setApprovalModal({
                          expId: ex.id, action: "approved",
                          label: `${ex.title} (₹${parseFloat(ex.amount).toLocaleString()})`,
                          endpoint: `/expenses/${ex.id}/admin-approve`,
                        })}>
                        ✓ Final Approve
                      </Btn>
                      <Btn color="red"
                        onClick={() => setApprovalModal({
                          expId: ex.id, action: "rejected",
                          label: `${ex.title} (₹${parseFloat(ex.amount).toLocaleString()})`,
                          endpoint: `/expenses/${ex.id}/reject`,
                        })}>
                        ✕ Reject
                      </Btn>
                    </>
                  )}
                  {ex.status === "admin_approved" && isAdmin && (
                    <Btn color="green" loading={acting === `/expenses/${ex.id}/reimburse`}
                      onClick={() => act(`/expenses/${ex.id}/reimburse`, null, "Marked as reimbursed")}>
                      Mark Reimbursed
                    </Btn>
                  )}

                  <Btn color="slate"
                    onClick={() => setHistoryId(historyId === ex.id ? null : ex.id)}>
                    {historyId === ex.id ? "Hide" : "History"}
                  </Btn>
                </div>

                {historyId === ex.id && (
                  <div className="mt-3">
                    <ApprovalHistory module="expense" refId={ex.id} onClose={() => setHistoryId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function Btn({ color, children, onClick, loading }) {
  const c = {
    blue:   "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    slate:  "bg-slate-100 text-slate-500  border-slate-200  hover:bg-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-md border font-medium transition disabled:opacity-50 ${c[color]}`}
    >
      {loading ? "…" : children}
    </button>
  );
}
