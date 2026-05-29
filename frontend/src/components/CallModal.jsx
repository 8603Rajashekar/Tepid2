import { useEffect, useRef, useState } from "react";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Clock, FileText, CheckCircle2, XCircle, PhoneMissed,
} from "lucide-react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

const OUTCOMES = [
  { key: "resolved",            label: "Resolved",            icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
  { key: "follow_up",           label: "Follow-up needed",    icon: Clock,        color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "no_answer",           label: "No answer",           icon: PhoneMissed,  color: "text-slate-500 bg-slate-50 border-slate-200" },
  { key: "callback_scheduled",  label: "Callback scheduled",  icon: Phone,        color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "transferred",         label: "Transferred",         icon: PhoneOutgoing,color: "text-orange-600 bg-orange-50 border-orange-200" },
  { key: "other",               label: "Other",               icon: FileText,     color: "text-slate-500 bg-slate-50 border-slate-200" },
];

function pad(n) { return String(n).padStart(2, "0"); }
function fmtDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function CallModal({ call, onClose, onSaved }) {
  const toast    = useToast();
  const timerRef = useRef(null);

  const [phase,    setPhase]    = useState("ringing");  // ringing | active | ended
  const [duration, setDuration] = useState(0);
  const [outcome,  setOutcome]  = useState("");
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);

  // Auto-connect after 2s (simulated ringing)
  useEffect(() => {
    const t = setTimeout(() => setPhase("active"), 2000);
    return () => clearTimeout(t);
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleEndCall = () => {
    clearInterval(timerRef.current);
    setPhase("ended");
  };

  const handleSave = async () => {
    if (!outcome) { toast.error("Please select a call outcome"); return; }
    setSaving(true);
    try {
      await api.patch(`/crm/${call.id}`, {
        call_duration_seconds: duration,
        call_outcome:          outcome,
        call_notes:            notes || undefined,
        // If resolved → update status too
        ...(outcome === "resolved" ? { status: "resolved" } : {}),
      });
      toast.success("Call saved successfully");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isOutbound = (call.direction || "outbound") === "outbound";
  const DirIcon    = isOutbound ? PhoneOutgoing : PhoneIncoming;
  const dirLabel   = isOutbound ? "Outbound Call" : "Inbound Call";
  const dirColor   = isOutbound ? "text-blue-600 bg-blue-50 border-blue-200" : "text-green-600 bg-green-50 border-green-200";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className={`px-6 py-5 ${
          phase === "ringing" ? "bg-gradient-to-r from-amber-500 to-orange-500" :
          phase === "active"  ? "bg-gradient-to-r from-green-600 to-emerald-600" :
                                "bg-gradient-to-r from-slate-700 to-slate-800"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              {/* Direction badge */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mb-2 ${dirColor}`}>
                <DirIcon size={10} /> {dirLabel}
              </span>
              <h2 className="text-white font-bold text-xl leading-tight">{call.customer_name}</h2>
              {call.company_name && (
                <p className="text-white/80 text-sm mt-0.5">🏢 {call.company_name}</p>
              )}
              <p className="text-white/90 font-mono text-base mt-1 tracking-wider">{call.phone}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none mt-1">✕</button>
          </div>

          {/* Timer / Status */}
          <div className="mt-4 flex items-center gap-3">
            {phase === "ringing" && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                <span className="text-white font-medium">Ringing…</span>
              </div>
            )}
            {phase === "active" && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                <span className="text-white font-mono text-xl font-bold tracking-widest">
                  {fmtDuration(duration)}
                </span>
              </div>
            )}
            {phase === "ended" && (
              <div className="flex items-center gap-2">
                <PhoneOff size={16} className="text-white/80" />
                <span className="text-white font-medium">
                  Call ended · {fmtDuration(duration)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="p-6 space-y-5">

          {/* During call */}
          {phase !== "ended" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Live Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Take notes during the call…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 focus:bg-white transition"
                />
              </div>

              {phase === "active" && (
                <button
                  onClick={handleEndCall}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm transition shadow-md hover:shadow-lg"
                >
                  <PhoneOff size={18} /> End Call
                </button>
              )}

              {phase === "ringing" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPhase("active")}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition"
                  >
                    <Phone size={16} /> Answer
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm transition"
                  >
                    <PhoneOff size={16} /> Decline
                  </button>
                </div>
              )}
            </>
          )}

          {/* After call ends — log outcome */}
          {phase === "ended" && (
            <>
              {/* Call outcome */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Call Outcome <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOutcome(key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                        outcome === key ? color : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Call Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of what was discussed…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 focus:bg-white transition"
                />
              </div>

              {/* Duration summary */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <Clock size={14} className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  Duration: <strong className="text-slate-800">{fmtDuration(duration)}</strong>
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!outcome || saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition"
                >
                  <CheckCircle2 size={16} />
                  {saving ? "Saving…" : "Save Call Log"}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                >
                  Discard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
