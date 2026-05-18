const PRIORITY_BADGE = {
  critical: "bg-red-600 text-white",
  high:     "bg-orange-500 text-white",
  medium:   "bg-yellow-400 text-slate-900",
  low:      "bg-slate-200 text-slate-600",
};

export default function EscalationAlerts({ calls }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
      <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span className="text-red-500">🚨</span> Escalation Alerts
        {calls.length > 0 && (
          <span className="ml-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            {calls.length}
          </span>
        )}
      </h2>

      {calls.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No escalations</p>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => (
            <div key={c.id} className="rounded-lg bg-red-50 border border-red-100 p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800 truncate">{c.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.sla_elapsed_minutes != null ? `${c.sla_elapsed_minutes}m elapsed` : ""}
                  {c.sla_breached ? " · SLA breached" : ""}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${PRIORITY_BADGE[c.priority] || "bg-slate-100 text-slate-600"}`}>
                {c.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
