export default function StatCard({ title, value, sub, color = "blue" }) {
  const colors = {
    blue:   { card: "bg-blue-50",   num: "text-blue-700",   dot: "bg-blue-500" },
    green:  { card: "bg-green-50",  num: "text-green-700",  dot: "bg-green-500" },
    yellow: { card: "bg-yellow-50", num: "text-yellow-700", dot: "bg-yellow-500" },
    purple: { card: "bg-purple-50", num: "text-purple-700", dot: "bg-purple-500" },
    red:    { card: "bg-red-50",    num: "text-red-700",    dot: "bg-red-500" },
    orange: { card: "bg-orange-50", num: "text-orange-700", dot: "bg-orange-500" },
    slate:  { card: "bg-slate-50",  num: "text-slate-700",  dot: "bg-slate-400" },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`rounded-xl p-5 ${c.card}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      </div>
      <p className={`text-3xl font-bold ${c.num}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
