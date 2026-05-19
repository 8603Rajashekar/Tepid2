export default function Card({ title, value, sub, color = "blue" }) {
  const colors = {
    blue:   "bg-blue-50   border-blue-200   text-blue-700",
    green:  "bg-green-50  border-green-200  text-green-700",
    red:    "bg-red-50    border-red-200    text-red-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    slate:  "bg-slate-50  border-slate-200  text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
    </div>
  );
}
