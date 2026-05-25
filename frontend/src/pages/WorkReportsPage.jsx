import { useEffect, useState } from "react";
import api from "../api/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const ROLE_LABEL = {
  admin: "Admin", super_admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", service_coordinator: "Coordinator",
  finance: "Finance", finance_officer: "Finance",
  employee: "Employee", crm: "CRM Agent",
};

const ROLE_COLOR = {
  admin: "bg-orange-100 text-orange-700",
  super_admin: "bg-orange-100 text-orange-700",
  supervisor: "bg-blue-100 text-blue-700",
  coordinator: "bg-purple-100 text-purple-700",
  service_coordinator: "bg-purple-100 text-purple-700",
  finance: "bg-green-100 text-green-700",
  finance_officer: "bg-green-100 text-green-700",
  employee: "bg-slate-100 text-slate-600",
  crm: "bg-teal-100 text-teal-700",
};

// What roles each viewer can filter by in team view
const FILTERABLE_ROLES = {
  admin:       ["employee", "coordinator", "supervisor", "finance", "crm"],
  super_admin: ["employee", "coordinator", "supervisor", "finance", "crm"],
  supervisor:  ["employee", "coordinator"],
  coordinator: null,  // no role filter for coordinator
};

export default function WorkReportsPage() {
  const role        = localStorage.getItem("role") || "";
  const canViewTeam = ["admin", "super_admin", "supervisor", "coordinator", "service_coordinator"].includes(role);
  const filterRoles = FILTERABLE_ROLES[role] || null;

  const [reports,   setReports]   = useState([]);
  const [tab,       setTab]       = useState("my");
  const [showForm,  setShowForm]  = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(null);
  const [search,    setSearch]    = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [form, setForm] = useState({
    report_date:   today(),
    hours_logged:  "",
    summary:       "",
    blockers:      "",
    tomorrow_plan: "",
  });

  const fetchReports = async (t = tab) => {
    try {
      const endpoint = t === "team" ? "/reports/team" : "/reports/me";
      const res = await api.get(endpoint);
      setReports(res.data);
    } catch {
      setError("Failed to load reports");
    }
  };

  useEffect(() => { fetchReports(tab); }, [tab]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post("/reports/", {
        ...form,
        hours_logged: parseFloat(form.hours_logged),
      });
      setSuccess("Report submitted successfully!");
      setShowForm(false);
      setForm({ report_date: today(), hours_logged: "", summary: "", blockers: "", tomorrow_plan: "" });
      fetchReports(tab);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg?.replace("Value error, ", "")).join(", ") || "Submission failed");
      } else {
        setError(typeof detail === "string" ? detail : "Submission failed");
      }
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────
  const visible = reports.filter((r) => {
    const nameMatch  = !search || (r.user_name || "").toLowerCase().includes(search.toLowerCase());
    const roleMatch  = roleFilter === "all" || r.user_role === roleFilter;
    return nameMatch && roleMatch;
  });

  // Stats
  const totalHours   = visible.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const avgHours     = visible.length ? (totalHours / visible.length).toFixed(1) : "0";
  const withBlockers = visible.filter((r) => r.blockers?.trim()).length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Work Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Daily submission · max 12 hours per day</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null); }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Submit Report
        </button>
      </div>

      {/* ── Alerts ── */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}

      {/* ── Submit form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700">Daily Work Report</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium">Date</label>
              <input type="date" required
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Hours Logged (max 12)</label>
              <input type="number" min="0.5" max="12" step="0.5" required
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.hours_logged}
                onChange={(e) => setForm({ ...form, hours_logged: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Summary <span className="text-slate-400">(min 10 chars)</span></label>
            <textarea required minLength={10}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="What did you accomplish today?"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Blockers <span className="text-slate-400">(optional)</span></label>
            <textarea
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Any blockers or issues?"
              value={form.blockers}
              onChange={(e) => setForm({ ...form, blockers: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Tomorrow's Plan <span className="text-slate-400">(optional)</span></label>
            <textarea
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="What are you planning tomorrow?"
              value={form.tomorrow_plan}
              onChange={(e) => setForm({ ...form, tomorrow_plan: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
              Submit Report
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Tabs (My / Team) ── */}
      {canViewTeam && (
        <div className="flex gap-1 border-b border-slate-200">
          {[
            { key: "my",   label: "My Reports" },
            { key: "team", label: "Team Reports" },
          ].map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); setRoleFilter("all"); }}
              className={`text-sm px-4 py-2 font-medium border-b-2 transition ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Search + Role Filter (team view only, not for coordinator) ── */}
      {tab === "team" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
          {/* Name search */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Search by Name</label>
            <input
              type="text"
              placeholder="Type employee name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Role filter — only for admin / supervisor */}
          {filterRoles && (
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Filter by Role</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    roleFilter === "all"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}>
                  All
                </button>
                {filterRoles.map((r) => (
                  <button key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition ${
                      roleFilter === r
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}>
                    {ROLE_LABEL[r] || r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result count */}
          {(search || roleFilter !== "all") && (
            <div className="flex items-end">
              <p className="text-xs text-slate-400">
                {visible.length} of {reports.length} reports
                <button onClick={() => { setSearch(""); setRoleFilter("all"); }}
                  className="ml-2 text-blue-500 hover:underline">Clear</button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Stats row ── */}
      {visible.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalHours}h</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Avg Hours / Day</p>
            <p className="text-2xl font-bold text-slate-800">{avgHours}h</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">With Blockers</p>
            <p className="text-2xl font-bold text-orange-500">{withBlockers}</p>
          </div>
        </div>
      )}

      {/* ── Reports list ── */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400">
            {tab === "team" ? "No team reports found" : "No reports yet — submit your first report above"}
          </div>
        ) : (
          visible.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(r.report_date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.hours_logged}h logged</p>
                </div>
                {/* Show reporter name + role in team view */}
                {tab === "team" && r.user_name && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-700">{r.user_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLOR[r.user_role] || "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABEL[r.user_role] || r.user_role}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-700 mb-2">{r.summary}</p>

              {r.blockers && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 mb-2">
                  <span className="font-semibold">Blocker:</span> {r.blockers}
                </div>
              )}
              {r.tomorrow_plan && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                  <span className="font-semibold">Tomorrow:</span> {r.tomorrow_plan}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
