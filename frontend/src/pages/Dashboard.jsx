import { useEffect, useState } from "react";
import api from "../api/api";
import Card from "../components/Card";

export default function Dashboard() {
  const [tasks,  setTasks]  = useState(null);
  const [calls,  setCalls]  = useState(null);
  const [agents, setAgents] = useState([]);
  const [error,  setError]  = useState(null);

  useEffect(() => {
    const load = () =>
      Promise.all([
        api.get("/analytics/overview"),
        api.get("/analytics/service-calls"),
        api.get("/analytics/agent-performance"),
      ])
        .then(([ov, sc, ap]) => {
          setTasks(ov.data.tasks);
          setCalls(sc.data.service_calls);
          setAgents(ap.data.agent_performance || []);
        })
        .catch(() => setError("Failed to load analytics"));

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (!tasks) return <p className="text-slate-400 text-sm animate-pulse">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>

      {/* Tasks */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Tasks Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card title="Total"          value={tasks.total}          color="slate"  />
          <Card title="In Progress"    value={tasks.in_progress}    color="blue"   />
          <Card title="Pending Review" value={tasks.pending_review} color="yellow" />
          <Card title="Approved"       value={tasks.approved}       color="green"  />
        </div>
      </section>

      {/* Service Calls */}
      {calls && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Service Calls</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card title="Total"      value={calls.total}       color="slate"  />
            <Card title="Assigned"   value={calls.assigned}    color="blue"   />
            <Card title="Escalated"  value={calls.escalated}   color="red"    />
            <Card title="Resolved"   value={calls.resolved}    color="green"  />
          </div>
        </section>
      )}

      {/* Agent Performance */}
      {agents.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Agent Performance</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Tasks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.slice(0, 10).map((a) => (
                  <tr key={a.agent_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.agent_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{a.total_tasks}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{a.approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
