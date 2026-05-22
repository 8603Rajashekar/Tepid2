import { useCallback, useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

// ── Constants ──────────────────────────────────────────────────────────

const CALL_TYPES = [
  { key: "service",  label: "Service Call",  icon: "🔧", color: "blue"   },
  { key: "issue",    label: "Issue Call",    icon: "⚠️",  color: "red"    },
  { key: "enquiry",  label: "Enquiry Call",  icon: "💬",  color: "purple" },
  { key: "order",    label: "Order Call",    icon: "🛒",  color: "green"  },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES   = ["open", "in_progress", "resolved", "closed"];

const STATUS_BADGE = {
  open:        "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-slate-100 text-slate-500",
};

const PRIORITY_BADGE = {
  low:    "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-600",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const TYPE_COLOR = {
  blue:   "border-blue-200 bg-blue-50 text-blue-700",
  red:    "border-red-200 bg-red-50 text-red-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700",
  green:  "border-green-200 bg-green-50 text-green-700",
};

const BLANK_FORM = {
  call_type: "service", customer_name: "", phone: "", location: "",
  description: "", priority: "medium",
  equipment_name: "", urgency: "",
  quantity: "", amount: "", special_requirements: "",
  question: "", response_given: "",
  follow_up_date: "",
};

const BLANK_REPORT = {
  report_date:   new Date().toISOString().slice(0, 10),
  hours_logged:  "",
  summary:       "",
  blockers:      "",
  tomorrow_plan: "",
};

// ── Small components ───────────────────────────────────────────────────

function Badge({ cls, children }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${cls}`}>
      {children}
    </span>
  );
}

function Input({ label, required, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        {...props}
      />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <textarea
        rows={2}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        {...props}
      />
    </div>
  );
}

function Select({ label, required, children, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-40 bg-slate-200 rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl border" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border" />)}
    </div>
  );
}

// ── Dynamic form fields by call type ──────────────────────────────────

function DynamicFields({ callType, form, set }) {
  if (callType === "service") return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Equipment Name" placeholder="e.g. AC Unit, Printer"
          value={form.equipment_name} onChange={(e) => set("equipment_name", e.target.value)} />
        <Input label="Urgency" placeholder="e.g. Immediate, Within 2 days"
          value={form.urgency} onChange={(e) => set("urgency", e.target.value)} />
      </div>
      <Textarea label="Problem Description"
        placeholder="Describe the issue in detail…"
        value={form.description} onChange={(e) => set("description", e.target.value)} />
    </>
  );

  if (callType === "issue") return (
    <>
      <Textarea label="Issue Description" placeholder="Describe the complaint or product issue…"
        value={form.description} onChange={(e) => set("description", e.target.value)} />
      <Textarea label="Response Given (optional)" placeholder="What was communicated to the customer…"
        value={form.response_given} onChange={(e) => set("response_given", e.target.value)} />
    </>
  );

  if (callType === "enquiry") return (
    <>
      <Textarea label="Customer Question" placeholder="What did the customer ask about?"
        value={form.question} onChange={(e) => set("question", e.target.value)} />
      <Textarea label="Response Given (optional)" placeholder="Information or quote provided…"
        value={form.response_given} onChange={(e) => set("response_given", e.target.value)} />
    </>
  );

  if (callType === "order") return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Equipment / Product Name" placeholder="e.g. Water Pump 3HP"
          value={form.equipment_name} onChange={(e) => set("equipment_name", e.target.value)} />
        <Input label="Quantity" type="number" min="1" placeholder="1"
          value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount (₹)" type="number" min="0" placeholder="0.00"
          value={form.amount} onChange={(e) => set("amount", e.target.value)} />
        <Textarea label="Special Requirements"
          placeholder="Colour, size, delivery instructions…"
          value={form.special_requirements} onChange={(e) => set("special_requirements", e.target.value)} />
      </div>
    </>
  );

  return null;
}

// ── Work Reports Section ───────────────────────────────────────────────

function WorkReportsSection() {
  const toast = useToast();
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [reportForm,  setReportForm]  = useState({ ...BLANK_REPORT });
  const role = localStorage.getItem("role") || "";
  const canViewAll = ["admin", "super_admin", "supervisor"].includes(role);
  const [tab, setTab] = useState("my");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === "team" ? "/reports/team" : "/reports/me";
      const res = await api.get(endpoint);
      setReports(res.data);
    } catch {
      toast.error("Failed to load work reports");
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/reports/", {
        ...reportForm,
        hours_logged: parseFloat(reportForm.hours_logged),
      });
      toast.success("Work report submitted");
      setShowForm(false);
      setReportForm({ ...BLANK_REPORT });
      loadReports();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = reports.reduce((s, r) => s + r.hours_logged, 0).toFixed(1);
  const withBlockers = reports.filter((r) => r.blockers?.trim()).length;
  const chartData = [...reports].slice(0, 10).reverse().map((r) => ({
    date:  new Date(r.report_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    hours: r.hours_logged,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Work Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">Submit and review your daily work reports</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setReportForm({ ...BLANK_REPORT }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
        >
          + Submit Report
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <form onSubmit={handleReportSubmit}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">End-of-Day Work Report</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <input type="date" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={reportForm.report_date}
                onChange={(e) => setReportForm((f) => ({ ...f, report_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Hours Logged <span className="text-slate-400 font-normal">(max 12)</span></label>
              <input type="number" required min="0.5" max="12" step="0.5"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. 8"
                value={reportForm.hours_logged}
                onChange={(e) => setReportForm((f) => ({ ...f, hours_logged: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Summary <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(min 10 chars)</span>
            </label>
            <textarea required minLength={10} rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="What did you accomplish today? Calls handled, issues resolved, follow-ups done…"
              value={reportForm.summary}
              onChange={(e) => setReportForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Blockers <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Any issues, pending escalations, or unresolved calls?"
              value={reportForm.blockers}
              onChange={(e) => setReportForm((f) => ({ ...f, blockers: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tomorrow's Plan <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Follow-ups to call, tasks planned for tomorrow…"
              value={reportForm.tomorrow_plan}
              onChange={(e) => setReportForm((f) => ({ ...f, tomorrow_plan: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Team / My tabs for admin */}
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

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-slate-200">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-slate-400 text-sm">No work reports yet</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-blue-600 text-sm hover:underline font-medium">
            Submit your first report →
          </button>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Reports</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{totalHours}h</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Hours</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{withBlockers}</p>
              <p className="text-xs text-slate-500 mt-0.5">With Blockers</p>
            </div>
          </div>

          {/* Bar chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Daily Hours</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={18}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 12]} allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Report list */}
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(r.report_date).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-400">{r.hours_logged}h logged
                      {r.user_name && <span> · {r.user_name}</span>}
                    </p>
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

// ── Main component ─────────────────────────────────────────────────────

export default function CRM() {
  const toast = useToast();

  const [section,      setSection]      = useState("calls");
  const [calls,        setCalls]        = useState([]);
  const [followups,    setFollowups]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("all");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate,   setShowCreate]   = useState(false);
  const [editCall,     setEditCall]     = useState(null);
  const [acting,       setActing]       = useState(null);
  const [form,         setForm]         = useState({ ...BLANK_FORM });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    try {
      const [callsRes, fuRes] = await Promise.all([
        api.get("/crm/"),
        api.get("/crm/follow-ups"),
      ]);
      setCalls(callsRes.data);
      setFollowups(fuRes.data);
    } catch {
      toast.error("Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        quantity: form.quantity ? parseInt(form.quantity)   : undefined,
        amount:   form.amount   ? parseFloat(form.amount)   : undefined,
        follow_up_date: form.follow_up_date || undefined,
      };
      // Remove empty strings
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await api.post("/crm/", payload);
      toast.success("Call logged successfully");
      setForm({ ...BLANK_FORM });
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create call");
    }
  };

  const handleStatusChange = async (call, newStatus) => {
    setActing(call.id);
    try {
      await api.patch(`/crm/${call.id}`, { status: newStatus });
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setActing(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this call?")) return;
    try {
      await api.delete(`/crm/${id}`);
      toast.success("Call deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────
  const visible = calls.filter((c) => {
    if (activeTab !== "all" && c.call_type !== activeTab)        return false;
    if (statusFilter !== "all" && c.status !== statusFilter)     return false;
    if (search && !c.customer_name.toLowerCase().includes(search.toLowerCase())
                && !(c.phone || "").includes(search)) return false;
    return true;
  });

  // ── Type stats ──────────────────────────────────────────────────────
  const stats = CALL_TYPES.reduce((acc, t) => {
    acc[t.key] = calls.filter((c) => c.call_type === t.key && c.status !== "closed").length;
    return acc;
  }, {});

  // ── Chart data ──────────────────────────────────────────────────────
  const PIE_COLORS = ["#3b82f6", "#ef4444", "#8b5cf6", "#10b981"];
  const chartData = CALL_TYPES.map((t, i) => ({
    name:  t.label.split(" ")[0],
    value: calls.filter((c) => c.call_type === t.key).length,
    fill:  PIE_COLORS[i],
  })).filter((d) => d.value > 0);

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CRM</h1>
          <p className="text-xs text-slate-400 mt-0.5">Call Log · Work Reports</p>
        </div>
        {section === "calls" && (
          <button
            onClick={() => { setShowCreate(!showCreate); setForm({ ...BLANK_FORM }); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition"
          >
            + Log Call
          </button>
        )}
      </div>

      {/* ── SECTION TABS ── */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "calls",   label: "📞 Call Log"      },
          { key: "reports", label: "📝 Work Reports"  },
        ].map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`text-sm px-5 py-2.5 font-semibold border-b-2 transition ${
              section === s.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── WORK REPORTS SECTION ── */}
      {section === "reports" && <WorkReportsSection />}

      {/* ── CALL LOG SECTION ── */}
      {section === "calls" && (<>

      {/* ── FOLLOW-UP ALERTS ── */}
      {followups.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700 mb-2">
            🔔 {followups.length} Follow-up{followups.length > 1 ? "s" : ""} Due
          </p>
          <div className="space-y-2">
            {followups.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{f.customer_name}</p>
                  <p className="text-xs text-slate-400">{f.phone} · {CALL_TYPES.find(t => t.key === f.call_type)?.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">
                    Due: {new Date(f.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    onClick={() => handleStatusChange(f, "resolved")}
                    className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-md hover:bg-green-200 transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CALL_TYPES.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key === activeTab ? "all" : t.key)}
            className={`rounded-xl border p-3 text-left transition ${
              activeTab === t.key ? TYPE_COLOR[t.color] : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{t.icon}</span>
              <span className={`text-lg font-bold ${activeTab === t.key ? "" : "text-slate-700"}`}>
                {stats[t.key]}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600">{t.label}</p>
            <p className="text-xs text-slate-400">active</p>
          </button>
        ))}
      </div>

      {/* ── CHART + SEARCH ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Distribution pie chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Call Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Search + filters */}
        <div className={`bg-white rounded-xl border border-slate-200 p-4 space-y-3 ${chartData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Search & Filter</h3>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 flex-wrap">
            {["all", ...STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition ${
                  statusFilter === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}>
                {s === "all" ? "All Status" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          {(search || statusFilter !== "all") && (
            <p className="text-xs text-slate-400">
              Showing {visible.length} of {calls.length} calls
              {search && <span> · "{search}"</span>}
              {statusFilter !== "all" && <span> · {statusFilter.replace("_", " ")}</span>}
              <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="ml-2 text-blue-500 hover:underline">Clear</button>
            </p>
          )}
        </div>
      </div>

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <form onSubmit={handleCreate}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Log New Call</h2>

          {/* Call type selector */}
          <div className="grid grid-cols-4 gap-2">
            {CALL_TYPES.map((t) => (
              <button key={t.key} type="button"
                onClick={() => set("call_type", t.key)}
                className={`py-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                  form.call_type === t.key
                    ? TYPE_COLOR[t.color]
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                <span className="text-base">{t.icon}</span>
                {t.label.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Contact (mandatory) */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Customer Name" required placeholder="Full name"
              value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            <Input label="Phone Number" required placeholder="+91 9876543210" type="tel"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Location" placeholder="City / Area"
              value={form.location} onChange={(e) => set("location", e.target.value)} />
            <Select label="Priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </Select>
          </div>

          {/* Dynamic fields by type */}
          <DynamicFields callType={form.call_type} form={form} set={set} />

          {/* Follow-up date */}
          <Input label="Follow-up Date (optional)" type="datetime-local"
            value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />

          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition">
              Log Call
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-1 border-b border-slate-200">
        {[{ key: "all", label: "All" }, ...CALL_TYPES].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.icon ? `${t.icon} ` : ""}{t.label}
            <span className="ml-1.5 text-xs">
              ({t.key === "all" ? calls.length : calls.filter(c => c.call_type === t.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* ── CALL LIST ── */}
      {visible.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-slate-200">
          <p className="text-3xl mb-2">📞</p>
          <p className="text-slate-400 text-sm">No calls logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((call) => {
            const typeInfo = CALL_TYPES.find((t) => t.key === call.call_type);
            const isFollowupDue = call.follow_up_date
              && new Date(call.follow_up_date) <= new Date()
              && !["closed","resolved"].includes(call.status);

            return (
              <div key={call.id}
                className={`bg-white rounded-xl border p-4 transition ${
                  isFollowupDue ? "border-red-200 shadow-sm" : "border-slate-200 hover:border-slate-300"
                }`}>

                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{typeInfo?.icon}</span>
                      <p className="font-semibold text-slate-800">{call.customer_name}</p>
                      <Badge cls={STATUS_BADGE[call.status]}>{call.status.replace("_", " ")}</Badge>
                      <Badge cls={PRIORITY_BADGE[call.priority]}>{call.priority}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      📞 {call.phone}
                      {call.location && <span> · 📍 {call.location}</span>}
                      <span className="ml-2">{new Date(call.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 ${TYPE_COLOR[typeInfo?.color]}`}>
                    {typeInfo?.label}
                  </span>
                </div>

                {/* Details */}
                {call.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5 mb-2">{call.description}</p>
                )}
                {call.question && (
                  <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">Q:</span> {call.question}
                  </p>
                )}
                {call.response_given && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">Response:</span> {call.response_given}
                  </p>
                )}
                {call.equipment_name && (
                  <p className="text-xs text-blue-700 mb-1">
                    🔧 {call.equipment_name}
                    {call.quantity && <span> · Qty: {call.quantity}</span>}
                    {call.amount   && <span> · ₹{parseFloat(call.amount).toLocaleString()}</span>}
                  </p>
                )}
                {call.follow_up_date && (
                  <p className={`text-xs font-medium mb-2 ${isFollowupDue ? "text-red-600" : "text-slate-500"}`}>
                    {isFollowupDue ? "🔔 Follow-up overdue:" : "📅 Follow-up:"}{" "}
                    {new Date(call.follow_up_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap mt-2">
                  {call.status === "open" && (
                    <button
                      disabled={acting === call.id}
                      onClick={() => handleStatusChange(call, "in_progress")}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-medium">
                      Start
                    </button>
                  )}
                  {call.status === "in_progress" && (
                    <button
                      disabled={acting === call.id}
                      onClick={() => handleStatusChange(call, "resolved")}
                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition font-medium">
                      ✓ Mark Resolved
                    </button>
                  )}
                  {call.status === "resolved" && (
                    <button
                      disabled={acting === call.id}
                      onClick={() => handleStatusChange(call, "closed")}
                      className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-medium">
                      Close
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(call.id)}
                    className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-medium">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}

    </div>
  );
}
