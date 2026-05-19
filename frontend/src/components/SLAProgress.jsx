export default function SLAProgress({ elapsed, total }) {
  if (!total || elapsed == null) return null;
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{elapsed}m elapsed</span>
        <span className={`font-semibold ${pct > 80 ? "text-red-600" : pct > 50 ? "text-yellow-600" : "text-green-600"}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
