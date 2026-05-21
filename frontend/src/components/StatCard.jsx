const PALETTE = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   label: "text-blue-600",   val: "text-blue-800",   dot: "bg-blue-500"   },
  green:  { bg: "bg-green-50",  border: "border-green-200",  label: "text-green-600",  val: "text-green-800",  dot: "bg-green-500"  },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", label: "text-yellow-600", val: "text-yellow-800", dot: "bg-yellow-500" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    label: "text-red-600",    val: "text-red-800",    dot: "bg-red-500"    },
  purple: { bg: "bg-purple-50", border: "border-purple-200", label: "text-purple-600", val: "text-purple-800", dot: "bg-purple-500" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-600", val: "text-orange-800", dot: "bg-orange-500" },
  slate:  { bg: "bg-slate-50",  border: "border-slate-200",  label: "text-slate-500",  val: "text-slate-800",  dot: "bg-slate-400"  },
};

/**
 * StatCard — reusable metric card.
 * Props:
 *   title  string  — metric label
 *   value  any     — main number / string (shows "—" if null/undefined)
 *   sub    string  — optional small subtitle below the value
 *   color  string  — palette key: blue | green | yellow | red | purple | orange | slate
 *   icon   string  — optional emoji/icon shown top-right (falls back to color dot if omitted)
 */
export default function StatCard({ title, value, sub, color = "blue", icon }) {
  const c = PALETTE[color] || PALETTE.slate;

  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {!icon && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />}
          <p className={`text-xs font-semibold uppercase tracking-wide truncate ${c.label}`}>{title}</p>
        </div>
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold mt-0.5 ${c.val}`}>{value ?? "—"}</p>
      {sub && <p className={`text-xs mt-1 ${c.label} opacity-75`}>{sub}</p>}
    </div>
  );
}
