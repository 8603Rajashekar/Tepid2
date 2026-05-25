import { useEffect, useState } from "react";
import api from "../../api/api";

const ACTION_STYLE = {
  approved:  { cls: "bg-green-50 border-green-200",   badge: "bg-green-100 text-green-700",   icon: "✓", label: "Approved"  },
  rejected:  { cls: "bg-red-50   border-red-200",     badge: "bg-red-100   text-red-700",     icon: "✕", label: "Rejected"  },
  escalated: { cls: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-700", icon: "⬆", label: "Escalated" },
};

const ROLE_LABEL = {
  admin: "Admin", super_admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", service_coordinator: "Coordinator",
  finance: "Finance", finance_officer: "Finance",
  employee: "Employee", crm: "CRM Agent",
};

function isDataUrl(s = "") {
  return typeof s === "string" && s.startsWith("data:image");
}

function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    + " · "
    + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/**
 * ApprovalHistory
 * Props:
 *   refId   — UUID of the record
 *   module  — optional module filter
 *   onClose — optional dismiss callback
 */
export default function ApprovalHistory({ refId, module, onClose }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!refId) return;
    api.get(`/approvals/${refId}/history`, { params: module ? { module } : undefined })
      .then((r) => setLogs(r.data))
      .catch(() => setError("Could not load approval history"))
      .finally(() => setLoading(false));
  }, [refId, module]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Approval History
        </p>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 text-center py-4">{error}</p>
        )}

        {!loading && !error && logs.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No approval events yet</p>
        )}

        {!loading && !error && logs.length > 0 && (
          <ol className="relative border-l-2 border-slate-200 space-y-5 ml-2">
            {logs.map((log) => {
              const style = ACTION_STYLE[log.action] || ACTION_STYLE.approved;
              return (
                <li key={log.id} className="ml-5">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${
                    log.action === "approved" ? "bg-green-500" :
                    log.action === "rejected" ? "bg-red-500"   : "bg-orange-500"
                  }`}>
                    {style.icon}
                  </span>

                  <div className={`border rounded-xl p-4 space-y-3 ${style.cls}`}>

                    {/* Action badge + date/time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${style.badge}`}>
                        {style.label}
                      </span>
                      <span className="text-xs text-slate-500 font-medium flex-shrink-0">
                        🕐 {fmt(log.timestamp)}
                      </span>
                    </div>

                    {/* Who approved — name + role */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(log.actor_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {log.actor_name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {ROLE_LABEL[log.actor_role] || log.actor_role?.replace("_", " ") || ""}
                        </p>
                      </div>
                    </div>

                    {/* Digital signature */}
                    {isDataUrl(log.signature_data) ? (
                      <div className="bg-white rounded-lg border border-slate-200 p-2">
                        <p className="text-xs text-slate-400 mb-1.5 font-medium">Digital Signature</p>
                        <img
                          src={log.signature_data}
                          alt="signature"
                          className="h-12 max-w-full object-contain"
                        />
                      </div>
                    ) : log.signature_data && !log.signature_data.startsWith("data:") ? (
                      <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-xs text-slate-400 mb-0.5">Signed as</p>
                        <p className="text-sm font-serif italic text-slate-800">{log.signature_data}</p>
                      </div>
                    ) : null}

                    {/* Rejection reason */}
                    {log.rejection_reason && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">Reason</p>
                        <p className="text-xs text-red-600">{log.rejection_reason}</p>
                      </div>
                    )}

                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
