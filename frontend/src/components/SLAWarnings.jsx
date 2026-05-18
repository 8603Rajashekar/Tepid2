// Uses only backend-enriched fields: sla_breached (>100% elapsed) and
// status === "escalated" (backend auto-escalates at 80%) — no client-side recalculation.
export default function SLAWarnings({ calls }) {
  const warnings = calls.filter((c) => c.sla_breached || c.status === "escalated");

  const pct = (c) => {
    if (c.sla_elapsed_minutes == null || !c.resolution_sla_minutes) return null;
    return Math.min(100, Math.round((c.sla_elapsed_minutes / c.resolution_sla_minutes) * 100));
  };

  const barColor = (p, breached) => {
    if (breached) return "bg-red-500";
    if (p > 80)   return "bg-red-400";
    return "bg-amber-400";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
      <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span className="text-amber-500">⚠</span> SLA Warnings
        {warnings.length > 0 && (
          <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {warnings.length}
          </span>
        )}
      </h2>

      {warnings.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">All calls within SLA</p>
      ) : (
        <div className="space-y-3">
          {warnings.map((c) => {
            const p = pct(c);
            return (
              <div key={c.id} className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-800 truncate pr-2">{c.title}</p>
                  <span className={`text-xs font-semibold flex-shrink-0 ${c.sla_breached ? "text-red-600" : "text-amber-600"}`}>
                    {c.sla_breached ? "BREACHED" : p != null ? `${p}%` : "AT RISK"}
                  </span>
                </div>
                {p != null && (
                  <div className="w-full bg-amber-100 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full ${barColor(p, c.sla_breached)}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {c.sla_elapsed_minutes}m / {c.resolution_sla_minutes}m — priority: <span className="font-medium">{c.priority}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
