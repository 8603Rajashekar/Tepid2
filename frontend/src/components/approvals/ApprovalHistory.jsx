import { useEffect, useState } from "react";
import api from "../../api/api";

const ACTION_STYLE = {
  approved:  { cls: "bg-green-100 text-green-700 border-green-200", icon: "✓" },
  rejected:  { cls: "bg-red-100   text-red-700   border-red-200",   icon: "✕" },
  escalated: { cls: "bg-orange-100 text-orange-700 border-orange-200", icon: "⬆" },
};

const SIG_ICON = { drawn: "🖊️", typed: "✍️" };

// Numeric level for each role — higher = more privileged
const ROLE_LEVEL = {
  employee:            0,
  coordinator:         1,
  service_coordinator: 1,
  supervisor:          2,
  finance:             3,
  finance_officer:     3,
  admin:               4,
  super_admin:         4,
};

function isDataUrl(s = "") {
  return s.startsWith("data:image");
}

function canViewSignature(viewerRole, actorRole) {
  const vl = ROLE_LEVEL[viewerRole] ?? 0;
  const al = ROLE_LEVEL[actorRole]  ?? 0;
  return vl >= al;
}

/**
 * ApprovalHistory
 *
 * Props:
 *   refId   — UUID string of the record
 *   onClose — optional callback to hide the panel
 */
export default function ApprovalHistory({ refId, module, onClose }) {
  const viewerRole = localStorage.getItem("role") || "";

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
              <div key={i} className="h-16 bg-slate-100 rounded-lg" />
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
            {logs.map((log, i) => {
              const style = ACTION_STYLE[log.action] || ACTION_STYLE.approved;
              const ts    = new Date(log.timestamp);
              return (
                <li key={log.id} className="ml-5">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold ${
                    log.action === "approved" ? "bg-green-500" :
                    log.action === "rejected" ? "bg-red-500" : "bg-orange-500"
                  } text-white`}>
                    {style.icon}
                  </span>

                  <div className={`border rounded-xl p-3 ${style.cls}`}>
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${style.cls}`}>
                          {log.action}
                        </span>
                        <span className="text-xs opacity-70" title={log.module}>
                          {log.module.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs opacity-60 flex-shrink-0">
                        {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Actor */}
                    <p className="text-xs font-semibold opacity-80 mb-1.5">
                      {log.actor_name || "Unknown actor"}
                      {log.actor_email ? <span className="font-normal opacity-70"> ({log.actor_email})</span> : null}
                      {log.actor_role && (
                        <span className="ml-1.5 capitalize font-normal opacity-60 bg-white/40 px-1.5 py-0.5 rounded text-[10px]">
                          {log.actor_role.replace("_", " ")}
                        </span>
                      )}
                    </p>

                    {/* Signature preview — masked if viewer role is below the signer's role */}
                    {canViewSignature(viewerRole, log.actor_role) ? (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{SIG_ICON[log.signature_type] || "✍️"}</span>
                        {log.signature_type === "drawn" && isDataUrl(log.signature_data) ? (
                          <img
                            src={log.signature_data}
                            alt="drawn signature"
                            className="h-8 bg-white rounded border border-current/20"
                          />
                        ) : (
                          <span className="text-xs font-serif italic opacity-90 truncate max-w-[200px]">
                            {!log.signature_data ? "—" : log.signature_data.startsWith("data:") ? "[drawn signature]" : log.signature_data}
                          </span>
                        )}
                        <span className="text-xs opacity-50 capitalize">{log.signature_type}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">🔒</span>
                        <span className="text-xs opacity-60 italic">
                          Signature restricted — {log.actor_role?.replace("_", " ")} level
                        </span>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {log.rejection_reason && (
                      <p className="text-xs opacity-80 bg-white/40 rounded-lg px-2 py-1 mb-1.5">
                        <span className="font-semibold">Reason:</span> {log.rejection_reason}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex gap-3 text-xs opacity-50 flex-wrap">
                      <span title={log.actor_id}>Actor ID: {log.actor_id.slice(0, 8)}…</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                      {log.user_agent && (
                        <span title={log.user_agent} className="truncate max-w-[180px]">
                          {log.user_agent.split(" ")[0]}
                        </span>
                      )}
                      <span
                        className="font-mono truncate max-w-[120px] cursor-help"
                        title={`SHA-256: ${log.hash}`}
                      >
                        #{log.hash.slice(0, 8)}…
                      </span>
                    </div>
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
