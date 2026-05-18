import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import { TaskPieChart, AgentBarChart } from "../components/Charts";
import api from "../services/api";

export default function Dashboard() {
  const [overview, setOverview]     = useState(null);
  const [agentPerf, setAgentPerf]   = useState([]);
  const [svcMetrics, setSvcMetrics] = useState(null);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    try {
      const [ov, ap, sc] = await Promise.all([
        api.get("/analytics/overview"),
        api.get("/analytics/agent-performance"),
        api.get("/analytics/service-calls"),
      ]);
      setOverview(ov.data.tasks);
      setAgentPerf(ap.data.agent_performance || []);
      setSvcMetrics(sc.data.service_calls);
    } catch {
      // 401 handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading analytics…
      </div>
    );
  }

  const kpis = [
    { title: "Total Tasks",    value: overview?.total,          color: "blue"   },
    { title: "In Progress",    value: overview?.in_progress,    color: "yellow" },
    { title: "Pending Review", value: overview?.pending_review, color: "purple" },
    { title: "Approved",       value: overview?.approved,       color: "green"  },
    { title: "Rejected",       value: overview?.rejected,       color: "red"    },
    { title: "Service Calls",  value: svcMetrics?.total,        color: "orange" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Analytics Dashboard</h1>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} color={k.color} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Status Breakdown</h3>
          <TaskPieChart tasks={overview} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Agent Performance</h3>
          <AgentBarChart agents={agentPerf} />
        </div>
      </div>

      {/* Service call summary row */}
      {svcMetrics && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Service Call Breakdown</h3>
          <div className="grid grid-cols-5 gap-3">
            {["open", "assigned", "in_progress", "resolved", "closed"].map((s) => (
              <div key={s} className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-700">{svcMetrics[s] ?? 0}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{s.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
