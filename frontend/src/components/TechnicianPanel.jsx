export default function TechnicianPanel({ calls, usersMap = {} }) {
  const grouped = {};
  calls.forEach((c) => {
    if (!c.assigned_to) return;
    if (!grouped[c.assigned_to]) grouped[c.assigned_to] = [];
    grouped[c.assigned_to].push(c);
  });

  const entries = Object.entries(grouped);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-700 mb-3">
        Technicians
        <span className="ml-2 text-xs font-normal text-slate-400">({entries.length} active)</span>
      </h2>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No assigned technicians</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([userId, techCalls]) => {
            const user       = usersMap[userId];
            const name       = user?.full_name || user?.email || userId.slice(0, 8) + "…";
            const inProgress = techCalls.filter((c) => c.status === "in_progress").length;
            const resolved   = techCalls.filter((c) => c.status === "resolved").length;
            const escalated  = techCalls.filter((c) => c.status === "escalated").length;

            return (
              <div key={userId} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                  <span className="text-sm font-bold text-slate-600">{techCalls.length} total</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-indigo-600 font-medium">{inProgress} in progress</span>
                  <span className="text-green-600 font-medium">{resolved} resolved</span>
                  {escalated > 0 && (
                    <span className="text-red-600 font-semibold">{escalated} escalated</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
