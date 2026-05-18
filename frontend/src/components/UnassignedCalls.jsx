const PRIORITY_TEXT = {
  critical: "text-red-600",
  high:     "text-orange-500",
  medium:   "text-yellow-500",
  low:      "text-green-500",
};

export default function UnassignedCalls({ calls }) {
  const unassigned = calls.filter((c) => !c.assigned_to);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
      <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span className="text-blue-500">📋</span> Pending Assignment
        {unassigned.length > 0 && (
          <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {unassigned.length}
          </span>
        )}
      </h2>

      {unassigned.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">All calls are assigned</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {unassigned.map((c) => (
            <div key={c.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.sla_elapsed_minutes != null ? `${c.sla_elapsed_minutes}m waiting` : ""}
                </p>
              </div>
              <p className={`text-xs font-bold uppercase flex-shrink-0 ${PRIORITY_TEXT[c.priority] || "text-slate-500"}`}>
                {c.priority}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
