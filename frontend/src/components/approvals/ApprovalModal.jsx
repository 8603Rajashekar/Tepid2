import { useRef, useState, useEffect } from "react";
import api from "../../api/api";
import { useToast } from "../../context/ToastContext";

// ── Draw-only signature canvas ─────────────────────────────────────────
function DrawCanvas({ onCapture }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

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
    if (!drawing.current) return;
    drawing.current = false;
    const data = canvasRef.current.toDataURL("image/png");
    setHasDrawn(true);
    onCapture(data);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onCapture("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={460}
        height={150}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-crosshair touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={stop}
      />
      <div className="flex items-center justify-between">
        {hasDrawn
          ? <span className="text-xs text-green-600 font-medium">✓ Signature drawn</span>
          : <span className="text-xs text-slate-400">Draw your signature above using mouse or finger</span>
        }
        <button type="button" onClick={clear}
          className="text-xs text-slate-400 hover:text-red-500 underline transition">
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * ApprovalModal
 * Props:
 *   module    — "task" | "expense" | "document" | "service_call"
 *   refId     — UUID string of the record
 *   action    — "approved" | "rejected" | "escalated"
 *   label     — human-readable record label
 *   endpoint  — API endpoint (default: /approvals/)
 *   onSuccess — called after successful submission
 *   onClose   — called when user dismisses
 */
export default function ApprovalModal({ module, refId, action, label, endpoint, onSuccess, onClose }) {
  const toast = useToast();
  const user  = JSON.parse(localStorage.getItem("user") || "{}");

  const [sigData,    setSigData]    = useState("");
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReject   = action === "rejected";
  const isEscalate = action === "escalated";

  // Drawn signature is mandatory — must have actual image data
  const hasSignature = sigData.startsWith("data:image");
  const canSubmit    = hasSignature && (!isReject || reason.trim().length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!hasSignature) {
        toast.error("Please draw your signature before submitting");
        return;
      }
      return;
    }

    const payload = {
      module,
      ref_id:           refId,
      action,
      signature_type:   "drawn",
      signature_data:   sigData,
      rejection_reason: isReject ? reason : undefined,
    };

    setSubmitting(true);
    try {
      await api.post(endpoint || "/approvals/", payload);
      toast.success(
        isReject   ? "Rejected and signed" :
        isEscalate ? "Escalated and signed" :
                     "Approved and signed"
      );
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 ${isReject ? "bg-red-600" : isEscalate ? "bg-orange-500" : "bg-green-600"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-lg">
                {isReject ? "✕ Reject" : isEscalate ? "⬆ Escalate" : "✓ Approve"}
                {label ? ` — ${label}` : ""}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                {isReject
                  ? "Provide a reason and draw your signature to reject"
                  : "Draw your signature to confirm this action"}
              </p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Signer identity */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user.full_name || user.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role?.replace("_", " ")}</p>
            </div>
          </div>

          {/* Rejection reason */}
          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain why this is being rejected…"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Digital Signature — Draw only */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Digital Signature <span className="text-red-500">* Required</span>
            </p>
            <DrawCanvas onCapture={setSigData} />
          </div>

          {/* Legal notice */}
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            By submitting, you confirm this action is authorised. Your signature, name and timestamp are permanently recorded.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`flex-1 text-white text-sm py-2.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                isReject   ? "bg-red-600 hover:bg-red-700" :
                isEscalate ? "bg-orange-500 hover:bg-orange-600" :
                             "bg-green-600 hover:bg-green-700"
              }`}
            >
              {submitting
                ? (isReject ? "Rejecting…" : isEscalate ? "Escalating…" : "Approving…")
                : (isReject ? "✕ Reject & Sign" : isEscalate ? "⬆ Escalate & Sign" : "✓ Approve & Sign")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-600 text-sm py-2.5 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>

          {!hasSignature && (
            <p className="text-center text-xs text-red-500 -mt-2">
              ⚠ Draw your signature above to enable submission
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
