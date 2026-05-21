import { useRef, useState, useEffect } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

const SIG_TABS = [
  { key: "typed", label: "Type Name", icon: "✍️" },
  { key: "drawn", label: "Draw",      icon: "🖊️" },
];

function DrawCanvas({ onCapture }) {
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const lastPos    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const p   = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPos.current = p;
  };

  const stop = () => {
    drawing.current = false;
    onCapture(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onCapture("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={460}
        height={140}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={stop}
      />
      <button type="button" onClick={clear}
        className="text-xs text-slate-400 hover:text-slate-600 underline">
        Clear
      </button>
    </div>
  );
}

/**
 * ApprovalModal
 *
 * Props:
 *   module   — "task" | "expense" | "document" | "service_call"
 *   refId    — UUID string of the record being approved/rejected
 *   action   — "approved" | "rejected"
 *   label    — human-readable record label (shown in header)
 *   onSuccess  — called after successful submission
 *   onClose    — called when user dismisses
 */
export default function ApprovalModal({ module, refId, action, label, endpoint, onSuccess, onClose }) {
  const toast = useToast();
  const user  = JSON.parse(localStorage.getItem("user") || "{}");

  const [sigTab,     setSigTab]     = useState("typed");
  const [sigData,    setSigData]    = useState(user.full_name || user.email || "");
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReject   = action === "rejected";
  const isEscalate = action === "escalated";
  const hasSignature = sigTab === "drawn" ? sigData.trim().length > 0 : sigData.trim().length > 0;
  const canSubmit  = hasSignature && (!isReject || reason.trim().length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      module,
      ref_id:           refId,
      action,
      signature_type:   sigTab,
      signature_data:   sigData,
      rejection_reason: isReject ? reason : undefined,
    };

    setSubmitting(true);
    try {
      await api.post(endpoint || "/approvals/", payload);
      toast.success(isReject ? "Rejected and logged" : isEscalate ? "Escalated and signed" : "Approved and signed");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approval failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 ${isReject ? "bg-red-600" : isEscalate ? "bg-orange-500" : "bg-green-600"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">
                {isReject ? "✕ Reject" : isEscalate ? "⬆ Escalate" : "✓ Approve"}{label ? ` — ${label}` : ""}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                {isReject
                  ? "Provide a reason and your signature to reject"
                  : isEscalate
                  ? "Add your signature to confirm escalation"
                  : "Add your signature to complete the approval"}
              </p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Rejection reason */}
          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain why this is being rejected so the submitter can correct it…"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Signature type tabs */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Signature <span className="text-red-500">*</span>
            </p>
            <div className="flex gap-1 mb-4 border border-slate-200 rounded-xl p-1 bg-slate-50">
              {SIG_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setSigTab(t.key); setSigData(t.key === "typed" ? (user.full_name || user.email || "") : ""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition ${
                    sigTab === t.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Draw */}
            {sigTab === "drawn" && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Draw your signature below:</p>
                <DrawCanvas onCapture={setSigData} />
                {sigData && (
                  <p className="text-xs text-green-600 mt-1">✓ Signature captured</p>
                )}
              </div>
            )}

            {/* Type */}
            {sigTab === "typed" && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Type your full name as your digital signature:</p>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-serif italic text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 tracking-wide"
                  value={sigData}
                  onChange={(e) => setSigData(e.target.value)}
                />
                {sigData && (
                  <p className="text-xs text-slate-400 mt-1 text-right">
                    Signing as: <span className="font-semibold text-slate-700">{sigData}</span>
                  </p>
                )}
              </div>
            )}

          </div>

          {/* Legal notice */}
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            By submitting, you confirm this action is authorised. This approval is timestamped,
            hashed, and permanently recorded. IP address and device are logged.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`flex-1 text-white text-sm py-2.5 rounded-xl font-semibold transition disabled:opacity-50 ${
                isReject
                  ? "bg-red-600 hover:bg-red-700"
                  : isEscalate
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {submitting
                ? (isReject ? "Rejecting…" : isEscalate ? "Escalating…" : "Approving…")
                : (isReject ? "✕ Reject" : isEscalate ? "⬆ Escalate & Sign" : "✓ Approve & Sign")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 text-sm py-2.5 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
