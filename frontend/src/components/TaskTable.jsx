const STATUS_STYLE = {
  new:            "bg-slate-100 text-slate-600",
  assigned:       "bg-amber-100 text-amber-700",
  in_progress:    "bg-blue-100 text-blue-700",
  pending_review: "bg-purple-100 text-purple-700",
  approved:       "bg-green-100 text-green-700",
  rejected:       "bg-red-100 text-red-700",
};

const PRIORITY_STYLE = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  normal:   "bg-blue-100 text-blue-700",
  low:      "bg-slate-100 text-slate-500",
};

function Badge({ value, styleMap }) {
  const cls = styleMap[value] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {value?.replace(/_/g, " ")}
    </span>
  );
}

export default function TaskTable({ tasks = [], actions, emptyText = "No tasks" }) {
  if (!tasks.length) {
    return <p className="px-5 py-8 text-sm text-slate-400 text-center">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Title", "Priority", "Due Date", "Status", ...(actions ? ["Actions"] : [])].map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
              <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs">
                <div className="truncate">{task.title}</div>
                {task.rejection_reason && (
                  <div className="text-xs text-red-500 mt-0.5 truncate">↩ {task.rejection_reason}</div>
                )}
              </td>
              <td className="px-5 py-3.5">
                <Badge value={task.priority} styleMap={PRIORITY_STYLE} />
              </td>
              <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                {new Date(task.due_date).toLocaleDateString()}
              </td>
              <td className="px-5 py-3.5">
                <Badge value={task.status} styleMap={STATUS_STYLE} />
              </td>
              {actions && <td className="px-5 py-3.5">{actions(task)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
