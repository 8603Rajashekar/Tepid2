import { useEffect, useState } from "react";
import api from "../services/api";

function EfficiencyBar({ score, max = 300 }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 60 ? "bg-green-500" : pct >= 30 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{score}</span>
    </div>
  );
}

export default function TeamOverview() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, perfRes] = await Promise.all([
          api.get("/users/"),
          api.get("/analytics/agent-performance"),
        ]);

        const userMap = {};
        (usersRes.data || []).forEach((u) => {
          userMap[u.id] = u;
        });

        const perf = perfRes.data.agent_performance || [];
        const combined = perf.map((p) => {
          const u = userMap[p.agent_id] || {};
          const approvalRate = p.total_tasks > 0
            ? Math.round((p.approved / p.total_tasks) * 100)
            : 0;
          const avgHours = p.avg_completion_seconds
            ? (p.avg_completion_seconds / 3600).toFixed(1)
            : null;

          return {
            id: p.agent_id,
            name: u.full_name || `Agent ${p.agent_id.slice(0, 8)}`,
            email: u.email || "—",
            department: u.department || "—",
            total: p.total_tasks,
            approved: p.approved,
            approvalRate,
            avgHours,
            score: p.approved * (avgHours ? Math.max(0, 10 - avgHours) : 5),
          };
        });

        combined.sort((a, b) => b.approvalRate - a.approvalRate);
        setRows(combined);
      } catch {
        setError("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Team Overview</h1>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Agent Performance
            <span className="ml-2 text-xs font-normal text-slate-400">({rows.length} agents)</span>
          </h2>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-sm text-slate-400 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-400 text-center">
            No task data available yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Rank", "Agent", "Department", "Tasks", "Approved", "Approval Rate", "Avg Time", "Score"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-300"}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-400">{row.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{row.department}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{row.total}</td>
                    <td className="px-5 py-3.5 font-semibold text-green-700">{row.approved}</td>
                    <td className="px-5 py-3.5 w-32">
                      <EfficiencyBar score={row.approvalRate} max={100} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {row.avgHours != null ? `${row.avgHours}h` : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-blue-700">
                      {Math.round(row.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
