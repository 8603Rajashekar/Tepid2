const BG = {
  blue:   "bg-blue-50   border-blue-200",
  green:  "bg-green-50  border-green-200",
  yellow: "bg-yellow-50 border-yellow-200",
  red:    "bg-red-50    border-red-200",
  purple: "bg-purple-50 border-purple-200",
  slate:  "bg-slate-50  border-slate-200",
};
const LBL = {
  blue: "text-blue-600", green: "text-green-600", yellow: "text-yellow-600",
  red: "text-red-600", purple: "text-purple-600", slate: "text-slate-500",
};
const VAL = {
  blue: "text-blue-800", green: "text-green-800", yellow: "text-yellow-800",
  red: "text-red-800", purple: "text-purple-800", slate: "text-slate-800",
};

export default function Card({ title, value, sub, color = "blue", icon }) {
  return (
    <div className={`rounded-xl border p-4 ${BG[color] || BG.blue}`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-xs font-semibold uppercase tracking-wide ${LBL[color] || LBL.blue}`}>{title}</p>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold mt-0.5 ${VAL[color] || VAL.blue}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}
