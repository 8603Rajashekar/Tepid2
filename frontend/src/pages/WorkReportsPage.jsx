import { useEffect, useState } from "react";
import api from "../services/api";

const MOOD_EMOJI = { great: "😊", good: "🙂", neutral: "😐", struggling: "😔" };
const MOOD_COLOR = {
  great:      "text-green-600",
  good:       "text-blue-600",
  neutral:    "text-slate-500",
  struggling: "text-red-500",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkReportsPage() {
  const role = localStorage.getItem("role") || "";
  const canViewTeam = ["super_admin", "admin", "supervisor", "manager"].includes(role);

  const [reports, setReports]       = useState([]);
  const [tab, setTab]               = useState("my");
  const [showForm, setShowForm]     = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);
  const [form, setForm] = useState({
    report_date:   today(),
    hours_logged:  "",
    summary:       "",
    blockers:      "",
    tomorrow_plan: "",
    mood:          "",
  });

  const fetchReports = async (t = tab) => {
    try {
      const endpoint = t === "team" ? "/work-reports/team" : "/work-reports/me";
      const res = await api.get(endpoint);
      setReports(res.data);
    } catch {
      setError("Failed to load reports");
    }
  };

  useEffect(() => { fetchReports(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.post("/work-reports/", {
        ...form,
        hours_logged: parseFloat(form.hours_logged),
        mood: form.mood || null,
      });
      setSuccess("Report submitted successfully!");
      setShowForm(false);
      setForm({ report_date: today(), hours_logged: "", summary: "", blockers: "", tomorrow_plan: "", mood: "" });
      fetchReports(tab);
    } catch (e) {
      setError(e.response?.data?.detail || "Submission failed");
    }
  };

  // Team analytics
  const totalHours   = reports.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const avgHours     = reports.length ? (totalHours / reports.length).toFixed(1) : "0";
  const withBlockers = reports.filter((r) => r.blockers?.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Work Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Daily submission · max 12 hours · max 2-day backdating</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null); }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Submit Report
        </button>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}

      {/* Submit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700">Daily Work Report</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium">Date</label>
              <input
                type="date" required
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Hours Logged (max 12)</label>
              <input
                type="number" min="0.5" max="12" step="0.5" required
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.hours_logged}
                onChange={(e) => setForm({ ...form, hours_logged: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Summary <span className="text-slate-400">(min 10 chars)</span></label>
            <textarea
              required minLength={10}
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
          <div>
            <label className="text-xs text-slate-500 font-medium">Mood</label>
            <div className="flex gap-2 mt-1">
              {["great", "good", "neutral", "struggling"].map((m) => (
                <button
                  key={m} type="button"
                  onClick={() => setForm({ ...form, mood: form.mood === m ? "" : m })}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                    form.mood === m
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {MOOD_EMOJI[m]} {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition">
              Submit
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      {canViewTeam && (
        <div className="flex gap-1 border-b border-slate-200">
          {["my", "team"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm px-4 py-2 font-medium border-b-2 transition ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "my" ? "My Reports" : "Team Reports"}
            </button>
          ))}
        </div>
      )}

      {/* Analytics row */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Hours</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalHours}h</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Hours / Day</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{avgHours}h</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Days with Blockers</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{withBlockers}</p>
          </div>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400">
            No reports yet
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(r.report_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-400">{r.hours_logged}h logged</p>
                </div>
                {r.mood && (
                  <span className={`text-sm font-medium ${MOOD_COLOR[r.mood]}`}>
                    {MOOD_EMOJI[r.mood]} {r.mood}
                  </span>
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
