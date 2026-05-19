import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateReport() {
  const navigate = useNavigate();
  const [error,  setError]  = useState(null);
  const [form,   setForm]   = useState({
    report_date:   today(),
    hours_logged:  "",
    summary:       "",
    blockers:      "",
    tomorrow_plan: "",
    mood:          "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/work-reports/", {
        ...form,
        hours_logged: parseFloat(form.hours_logged),
        mood: form.mood || null,
      });
      navigate("/work-reports");
    } catch (e) {
      setError(e.response?.data?.detail || "Submission failed");
    }
  };

  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/work-reports")} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
        <h1 className="text-xl font-bold text-slate-800">Submit Work Report</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input type="date" required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.report_date} onChange={(e) => field("report_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hours (max 12)</label>
            <input type="number" required min="0.5" max="12" step="0.5"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.hours_logged} onChange={(e) => field("hours_logged", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Summary <span className="text-slate-400 font-normal">(min 10 chars)</span></label>
          <textarea required minLength={10} rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="What did you accomplish today?"
            value={form.summary} onChange={(e) => field("summary", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Blockers <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Any blockers or issues?"
            value={form.blockers} onChange={(e) => field("blockers", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tomorrow's Plan <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="What are you planning tomorrow?"
            value={form.tomorrow_plan} onChange={(e) => field("tomorrow_plan", e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Mood</label>
          <div className="flex gap-2">
            {[["great","😊"],["good","🙂"],["neutral","😐"],["struggling","😔"]].map(([m, emoji]) => (
              <button key={m} type="button"
                onClick={() => field("mood", form.mood === m ? "" : m)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition ${
                  form.mood === m
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}>
                {emoji} {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            Submit Report
          </button>
          <button type="button" onClick={() => navigate("/work-reports")}
            className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
