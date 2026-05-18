const STATUS_COLOR = {
  new:                "bg-slate-100 text-slate-700",
  pending_assignment: "bg-yellow-100 text-yellow-700",
  assigned:           "bg-blue-100 text-blue-700",
  in_progress:        "bg-indigo-100 text-indigo-700",
  resolved:           "bg-green-100 text-green-700",
  closed:             "bg-slate-200 text-slate-500",
  escalated:          "bg-red-100 text-red-700",
};

const PRIORITY_TEXT = {
  critical: "text-red-600",
  high:     "text-orange-500",
  medium:   "text-yellow-500",
  low:      "text-green-500",
};

function slaPercent(c) {
  if (c.sla_elapsed_minutes == null || !c.resolution_sla_minutes) return null;
  return Math.min(100, Math.round((c.sla_elapsed_minutes / c.resolution_sla_minutes) * 100));
}

function barColor(pct) {
  if (pct > 80) return "bg-red-500";
  if (pct > 50) return "bg-yellow-500";
  return "bg-green-500";
}

export default function ActiveCalls({ calls }) {
  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-700 mb-3">Active Calls</h2>
        <p className="text-sm text-slate-400 text-center py-6">No active calls</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-700 mb-3">
        Active Calls
        <span className="ml-2 text-xs font-normal text-slate-400">({calls.length})</span>
      </h2>
      <div className="divide-y divide-slate-100">
        {calls.map((c) => {
          const pct = slaPercent(c);
          return (
            <div key={c.id} className="py-3">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                <span className={`text-xs font-bold flex-shrink-0 uppercase ${PRIORITY_TEXT[c.priority] || "text-slate-500"}`}>
                  {c.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] || "bg-slate-100 text-slate-600"}`}>
                  {c.status.replace(/_/g, " ")}
                </span>
                {pct != null && (
                  <span className="text-xs text-slate-400">{c.sla_elapsed_minutes}m / {c.resolution_sla_minutes}m</span>
                )}
              </div>
              {pct != null && (
                <div className="w-full bg-gray-200 h-1.5 rounded-full">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
