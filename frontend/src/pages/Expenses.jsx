import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import ApprovalHistory from "../components/approvals/ApprovalHistory";
import ApprovalModal from "../components/approvals/ApprovalModal";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"]);

function fileExt(url = "") {
  return (url.split(".").pop() || "").toLowerCase().replace(/\?.*$/, "");
}

function isImage(url = "") {
  return IMAGE_EXTS.has("." + fileExt(url));
}

function receiptSrc(url) {
  if (!url) return null;
  return url.startsWith("/uploads")
    ? `${process.env.REACT_APP_API_URL}${url}`
    : url;
}

// ── Upload zone ────────────────────────────────────────────────────────
function UploadZone({ file, onChange, required }) {
  const ref    = useRef(null);
  const [drag, setDrag] = useState(false);
  const preview = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

  const accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip";

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        Proof / Supporting Document
        {required
          ? <span className="ml-1 text-red-500">* Required (amount &gt; ₹999)</span>
          : <span className="ml-1 text-slate-400 font-normal">(optional — image, PDF, doc)</span>
        }
      </label>

      {file ? (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          {preview
            ? <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
            : <div className="w-16 h-16 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-2xl flex-shrink-0">📄</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition flex-shrink-0">
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
          onClick={() => ref.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 px-4 cursor-pointer transition select-none ${
            drag ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <span className="text-3xl">📸</span>
          <p className="text-sm font-semibold text-slate-700">Tap to attach proof</p>
          <p className="text-xs text-slate-400">Screenshot, photo, PDF or document</p>
          <p className="text-xs text-slate-300">JPG · PNG · PDF · DOC · XLSX</p>
        </div>
      )}

      {/* Hidden inputs — one for gallery/files, one for camera on mobile */}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)} />

      {!file && (
        <label className="mt-2 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium cursor-pointer hover:underline">
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onChange(e.target.files[0] || null)} />
          📷 Use camera
        </label>
      )}

      {required && !file && (
        <p className="text-xs text-red-500 mt-1">Please attach a receipt or invoice before submitting</p>
      )}
    </div>
  );
}

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

  const [expenses,      setExpenses]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [acting,        setActing]        = useState(null);
  const [historyId,     setHistoryId]     = useState(null);
  const [receiptFile,   setReceiptFile]   = useState(null);
  const [attachFor,     setAttachFor]     = useState(null);   // expense id to attach proof to
  const [attachFile,    setAttachFile]    = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);   // { expId, action, label, endpoint }
  const [lightbox,      setLightbox]      = useState(null);   // image url to show fullscreen
  const [form,          setForm]          = useState({
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

  const uploadFile = async (expenseId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/expenses/${expenseId}/receipt`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (receiptRequired && !receiptFile) {
      toast.error("A supporting document is required for expenses above ₹999");
      return;
    }
    try {
      const res = await api.post("/expenses/", { ...form, amount: parseFloat(form.amount) });
      if (receiptFile) await uploadFile(res.data.id, receiptFile);
      setForm({ title: "", category: "other", amount: "", currency: "USD", description: "" });
      setReceiptFile(null);
      setShowCreate(false);
      toast.success("Expense created");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Create failed");
    }
  };

  const handleAttachProof = async (expenseId) => {
    if (!attachFile) return;
    setActing(`attach-${expenseId}`);
    try {
      await uploadFile(expenseId, attachFile);
      toast.success("Proof attached");
      setAttachFor(null);
      setAttachFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setActing(null);
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

          <UploadZone file={receiptFile} onChange={setReceiptFile} required={receiptRequired} />

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">Create</button>
            <button type="button" onClick={() => { setShowCreate(false); setReceiptFile(null); }}
              className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Lightbox for image proof */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)}
              className="absolute -top-8 right-0 text-white text-sm font-medium hover:text-slate-300">
              ✕ Close
            </button>
            <img src={lightbox} alt="proof" className="w-full rounded-xl shadow-2xl max-h-[80vh] object-contain" />
          </div>
        </div>
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

                {/* Proof / receipt display */}
                {ex.receipt_url ? (
                  <div className="mb-2">
                    {isImage(ex.receipt_url) ? (
                      <button type="button" onClick={() => setLightbox(receiptSrc(ex.receipt_url))}
                        className="block group relative">
                        <img
                          src={receiptSrc(ex.receipt_url)}
                          alt="proof"
                          className="h-24 w-auto max-w-[180px] rounded-lg border border-slate-200 object-cover group-hover:opacity-90 transition"
                        />
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <span className="bg-black/50 text-white text-xs rounded-md px-2 py-1">🔍 View</span>
                        </span>
                      </button>
                    ) : (
                      <a
                        href={receiptSrc(ex.receipt_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 px-3 py-1.5 rounded-lg transition font-medium"
                      >
                        📎 View Proof ({fileExt(ex.receipt_url).toUpperCase()})
                      </a>
                    )}
                  </div>
                ) : ex.status === "draft" && (
                  <div className="mb-2">
                    {attachFor === ex.id ? (
                      <div className="space-y-2">
                        <UploadZone file={attachFile} onChange={setAttachFile} required={false} />
                        <div className="flex gap-2">
                          <button type="button"
                            disabled={!attachFile || acting === `attach-${ex.id}`}
                            onClick={() => handleAttachProof(ex.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                            {acting === `attach-${ex.id}` ? "Uploading…" : "Upload Proof"}
                          </button>
                          <button type="button" onClick={() => { setAttachFor(null); setAttachFile(null); }}
                            className="text-xs text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => { setAttachFor(ex.id); setAttachFile(null); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium hover:underline flex items-center gap-1">
                        📎 Attach proof
                      </button>
                    )}
                  </div>
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
