import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_API_URL}/api/v1`;

const PRIORITY_COLORS = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  normal: { bg: "bg-blue-100", text: "text-blue-700" },
  low: { bg: "bg-slate-100", text: "text-slate-600" },
};

function Badge({ colorMap, value }) {
  const c = colorMap[value] || { bg: "bg-slate-100", text: "text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {value?.replace(/_/g, " ")}
    </span>
  );
}

export default function ManagerDashboard({ onLogout }) {
  const token   = localStorage.getItem("token");
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const headers = { Authorization: `Bearer ${token}` };

  const [tasks, setTasks]          = useState([]);
  const [serviceCalls, setService] = useState([]);
  const [overview, setOverview]    = useState(null);
  const [loading, setLoading]      = useState(true);
  const [approving, setApproving]  = useState(null);

  const load = () => {
    Promise.all([
      fetch(`${API}/tasks/`, { headers }).then(r => r.json()),
      fetch(`${API}/service-calls/`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${API}/analytics/overview`, { headers }).then(r => r.json()),
    ]).then(([t, s, o]) => {
      setTasks(Array.isArray(t) ? t : []);
      setService(Array.isArray(s) ? s : []);
      setOverview(o.tasks || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingReview = tasks.filter(t => t.status === "pending_review");
  const openCalls     = serviceCalls.filter(c => c.status === "open");

  const handleApprove = async (taskId, action) => {
    setApproving(taskId);
    try {
      await fetch(`${API}/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      load();
    } catch {
      alert("Action failed");
    } finally {
      setApproving(null);
    }
  };

  const kpis = [
    { label: "Total Tasks",    value: overview?.total ?? "—",   cls: "bg-blue-50 text-blue-700" },
    { label: "Pending Review", value: pendingReview.length,     cls: "bg-purple-50 text-purple-700" },
    { label: "Approved",       value: overview?.approved ?? "—", cls: "bg-green-50 text-green-700" },
    { label: "Open Calls",     value: openCalls.length,         cls: "bg-orange-50 text-orange-700" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Field Ops</div>
              <div className="text-xs text-slate-400">Manager Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {["Overview", "Pending Review", "Service Calls"].map(item => (
            <div key={item} className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition">
              {item}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-3 truncate">{user.full_name || user.email}</div>
          <button onClick={onLogout} className="w-full text-xs text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200 py-1.5 rounded-lg transition">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h1 className="text-xl font-bold text-slate-800">Manager Dashboard</h1>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map(card => (
              <div key={card.label} className={`rounded-xl p-5 ${card.cls.split(" ")[0]}`}>
                <p className="text-xs font-medium text-slate-500 mb-1">{card.label}</p>
                <p className={`text-3xl font-bold ${card.cls.split(" ")[1]}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Pending Approval */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Tasks Pending Approval</h2>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{pendingReview.length}</span>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-5 py-8 text-sm text-slate-400 text-center">Loading…</div>
              ) : pendingReview.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-400 text-center">No tasks awaiting review</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Title", "Priority", "Due Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReview.map(task => (
                      <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{task.title}</td>
                        <td className="px-5 py-3.5"><Badge colorMap={PRIORITY_COLORS} value={task.priority} /></td>
                        <td className="px-5 py-3.5 text-slate-500">{new Date(task.due_date).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(task.id, "approved")}
                              disabled={approving === task.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprove(task.id, "rejected")}
                              disabled={approving === task.id}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Open Service Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Open Service Calls</h2>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">{openCalls.length}</span>
            </div>
            <div className="overflow-x-auto">
              {openCalls.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-400 text-center">No open service calls</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Customer", "Phone", "Issue", "Created"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openCalls.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{c.customer_name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{c.customer_phone}</td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{c.issue_description}</td>
                        <td className="px-5 py-3.5 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
