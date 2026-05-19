import { useEffect, useState } from "react";
import api from "../api/api";
import SLAProgress from "../components/SLAProgress";
import Card from "../components/Card";

const STATUS_COLOR = {
  new:                "bg-slate-100 text-slate-600",
  pending_assignment: "bg-yellow-100 text-yellow-700",
  assigned:           "bg-blue-100 text-blue-700",
  in_progress:        "bg-indigo-100 text-indigo-700",
  resolved:           "bg-green-100 text-green-700",
  closed:             "bg-slate-200 text-slate-500",
  escalated:          "bg-red-100 text-red-700",
};

const PRIORITY_COLOR = {
  critical: "text-red-600",
  high:     "text-orange-500",
  medium:   "text-yellow-500",
  low:      "text-green-600",
};

export default function ServiceCalls() {
  const role       = localStorage.getItem("role") || "";
  const canManage  = ["super_admin", "admin", "coordinator"].includes(role);

  const [calls,       setCalls]       = useState([]);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [rejectId,    setRejectId]    = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [form,        setForm]        = useState({ title: "", description: "", priority: "medium" });

  const fetchCalls = async () => {
    try {
      const res = await api.get("/service-calls");
      setCalls(res.data);
      setError(null);
    } catch {
      setError("Failed to load service calls");
    }
  };

  useEffect(() => {
    fetchCalls();
    const id = setInterval(fetchCalls, 5000);
    return () => clearInterval(id);
  }, []);

  const act = async (endpoint) => {
    try {
      await api.post(endpoint);
      fetchCalls();
    } catch (e) {
      setError(e.response?.data?.detail || "Action failed");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/service-calls", form);
      setForm({ title: "", description: "", priority: "medium" });
      setShowCreate(false);
      fetchCalls();
    } catch (e) {
      setError(e.response?.data?.detail || "Create failed");
    }
  };

  const handleResolve = async () => {
    try {
      await api.post(`/service-calls/${rejectId}/resolve`, { resolution_notes: rejectNotes });
      setRejectId(null);
      setRejectNotes("");
      fetchCalls();
    } catch (e) {
      setError(e.response?.data?.detail || "Resolve failed");
    }
  };

  const active    = calls.filter((c) => !["closed"].includes(c.status));
  const escalated = calls.filter((c) => c.status === "escalated");
  const resolved  = calls.filter((c) => c.status === "resolved" || c.status === "closed");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Service Calls</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + New Call
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card title="Active"    value={active.length}    color="blue"  />
        <Card title="Escalated" value={escalated.length} color="red"   />
        <Card title="Resolved"  value={resolved.length}  color="green" />
        <Card title="Total"     value={calls.length}     color="slate" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700">New Service Call</h2>
          <input required placeholder="Title (min 5 chars)" minLength={5}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required placeholder="Describe the issue (min 10 chars)" minLength={10} rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["critical", "high", "medium", "low"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Resolve modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-slate-800 mb-3">Resolution Notes</h2>
            <textarea rows={3} placeholder="Describe how the issue was resolved…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleResolve} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition">Resolve</button>
              <button onClick={() => { setRejectId(null); setRejectNotes(""); }}
                className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Calls list */}
      <div className="space-y-3">
        {calls.length === 0 && <p className="text-slate-400 text-sm text-center py-10 bg-white rounded-xl border border-slate-200">No service calls</p>}
        {calls.map((c) => (
          <div key={c.id} className={`bg-white rounded-xl border p-4 ${c.status === "escalated" ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-semibold text-slate-800 truncate">{c.title}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold uppercase ${PRIORITY_COLOR[c.priority]}`}>{c.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] || "bg-slate-100 text-slate-500"}`}>
                  {c.status?.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{c.description}</p>

            {/* SLA Bar */}
            <SLAProgress elapsed={c.sla_elapsed_minutes} total={c.resolution_sla_minutes} />

            {/* Actions */}
            <div className="flex gap-2 flex-wrap mt-3">
              {c.status === "assigned" && (
                <Btn color="indigo" onClick={() => act(`/service-calls/${c.id}/start`)}>Start</Btn>
              )}
              {c.status === "in_progress" && (
                <Btn color="green" onClick={() => setRejectId(c.id)}>Resolve</Btn>
              )}
              {c.status === "resolved" && canManage && (
                <Btn color="slate" onClick={() => act(`/service-calls/${c.id}/close`)}>Close</Btn>
              )}
              {!["resolved", "closed", "escalated"].includes(c.status) && canManage && (
                <Btn color="red" onClick={() => act(`/service-calls/${c.id}/escalate`)}>Escalate</Btn>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Btn({ color, children, onClick }) {
  const c = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
    slate:  "bg-slate-100 text-slate-600  border-slate-200  hover:bg-slate-200",
  };
  return (
    <button onClick={onClick} className={`text-xs px-3 py-1 rounded-md border font-medium transition ${c[color]}`}>
      {children}
    </button>
  );
}
