import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import ActiveCalls from "../components/ActiveCalls";
import SLAWarnings from "../components/SLAWarnings";
import TechnicianPanel from "../components/TechnicianPanel";
import EscalationAlerts from "../components/EscalationAlerts";
import UnassignedCalls from "../components/UnassignedCalls";

const COLOR = {
  blue:  "border-blue-200 bg-blue-50 text-blue-700",
  red:   "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  green: "border-green-200 bg-green-50 text-green-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function StatCard({ title, value, sub, color = "blue" }) {
  return (
    <div className={`rounded-xl border p-4 ${COLOR[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

export default function ServiceDashboard() {
  const [calls, setCalls]       = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]       = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users/");
      const map = {};
      res.data.forEach((u) => { map[u.id] = u; });
      setUsersMap(map);
    } catch {
      // users list is optional — technician panel degrades to UUID display
    }
  }, []);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await api.get("/service-calls");
      setCalls(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Failed to load service calls");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active     = calls.filter((c) => c.status !== "closed");
  const escalated  = calls.filter((c) => c.status === "escalated");
  const unassigned = calls.filter((c) => !c.assigned_to && c.status !== "closed");
  // sla_breached comes from backend; escalated status means ≥80% threshold was hit
  const slaRisk    = active.filter((c) => c.sla_breached || c.status === "escalated");
  const resolved   = calls.filter((c) => c.status === "resolved" || c.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Service Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 5s
            </p>
          )}
        </div>
        <button
          onClick={fetchCalls}
          className="text-xs text-slate-500 border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Active"      value={active.length}     color="blue"  sub="open + in progress" />
        <StatCard title="Unassigned"  value={unassigned.length} color="slate" sub="pending assignment" />
        <StatCard title="Escalated"   value={escalated.length}  color="red"   sub="needs attention" />
        <StatCard title="SLA Risk"    value={slaRisk.length}    color="amber" sub="breached or escalated" />
        <StatCard title="Resolved"    value={resolved.length}   color="green" sub="resolved + closed" />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveCalls calls={active} />
        <SLAWarnings calls={active} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UnassignedCalls calls={calls} />
        <TechnicianPanel calls={active} usersMap={usersMap} />
      </div>

      {/* Row 3 — full width */}
      <EscalationAlerts calls={escalated} />
    </div>
  );
}
