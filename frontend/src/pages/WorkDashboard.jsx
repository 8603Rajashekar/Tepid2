import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import Card from "../components/Card";

const MOOD_EMOJI = { great: "😊", good: "🙂", neutral: "😐", struggling: "😔" };

export default function WorkDashboard() {
  const role       = localStorage.getItem("role") || "";
  const canViewAll = ["super_admin", "admin", "supervisor"].includes(role);

  const [reports,  setReports]  = useState([]);
  const [tab,      setTab]      = useState("my");
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const endpoint = tab === "team" ? "/work-reports/team" : "/work-reports/me";
    api.get(endpoint)
      .then((r) => { setReports(r.data); setError(null); })
      .catch(() => setError("Failed to load reports"));
  }, [tab]);

  const totalHours   = reports.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const withBlockers = reports.filter((r) => r.blockers?.trim()).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Work Reports</h1>
        <Link to="/report"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Submit Report
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Stats */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card title="Total Reports"    value={reports.length}  color="blue"   />
          <Card title="Total Hours"      value={`${totalHours}h`} color="green"  />
          <Card title="Days w/ Blockers" value={withBlockers}    color="yellow" />
        </div>
      )}

      {/* Tabs */}
      {canViewAll && (
        <div className="flex gap-1 border-b border-slate-200">
          {["my", "team"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm px-4 py-2 font-medium border-b-2 transition ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "my" ? "My Reports" : "Team Reports"}
            </button>
          ))}
        </div>
      )}

      {/* Reports */}
      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-400 text-sm">No reports yet</p>
            <Link to="/report" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              Submit your first report →
            </Link>
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-slate-800">
                  {new Date(r.report_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
                <p className="text-xs text-slate-400">{r.hours_logged}h logged</p>
              </div>
              {r.mood && (
                <span className="text-sm">{MOOD_EMOJI[r.mood]} <span className="text-xs text-slate-500 capitalize">{r.mood}</span></span>
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
        ))}
      </div>
    </div>
  );
}
