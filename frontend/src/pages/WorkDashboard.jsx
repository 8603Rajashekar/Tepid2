import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../api/api";
import Card from "../components/Card";

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );
}

export default function WorkDashboard() {
  const role       = localStorage.getItem("role") || "";
  const canViewAll = ["admin", "super_admin", "supervisor"].includes(role);

  const [reports, setReports] = useState([]);
  const [tab,     setTab]     = useState("my");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    const endpoint = tab === "team" ? "/reports/team" : "/reports/me";
    api.get(endpoint)
      .then((r) => { setReports(r.data); setError(null); })
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [tab]);

  const totalHours   = reports.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const withBlockers = reports.filter((r) => r.blockers?.trim()).length;
  const avgHours     = reports.length ? (totalHours / reports.length).toFixed(1) : 0;

  // Chart data — last 7 reports for bar chart
  const chartData = [...reports]
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      date:  new Date(r.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: r.hours_logged,
    }));

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Work Reports</h1>
        <Link to="/report"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          + Submit Report
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Tabs */}
      {canViewAll && (
        <div className="flex gap-1 border-b border-slate-200">
          {["my", "team"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm px-4 py-2 font-medium border-b-2 transition ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "my" ? "My Reports" : "Team Reports"}
            </button>
          ))}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm mb-3">No reports yet</p>
          <Link to="/report" className="inline-block text-blue-600 text-sm hover:underline font-medium">
            Submit your first report →
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card title="Total Reports" value={reports.length}     color="blue"   />
            <Card title="Total Hours"   value={`${totalHours}h`}   color="green"  />
            <Card title="Avg Hours/Day" value={`${avgHours}h`}     color="purple" />
          </div>

          {/* Charts row */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Hours Logged</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={20}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 12]} allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Blockers callout */}
          {withBlockers > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠</span>
              <p className="text-sm text-red-700 font-medium">
                {withBlockers} report{withBlockers > 1 ? "s" : ""} with blockers — check the list below
              </p>
            </div>
          )}

          {/* Report cards */}
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(r.report_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-400">{r.hours_logged}h logged</p>
                  </div>
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
        </>
      )}
    </div>
  );
}
