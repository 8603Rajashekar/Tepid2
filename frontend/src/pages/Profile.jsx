import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Briefcase, Tag, Calendar,
  CheckCircle2, Clock, TrendingUp, Layers,
  Receipt, BadgeCheck, XCircle, Wallet,
  Bell, ChevronRight, Camera, Lock, Pencil,
  Eye, EyeOff, ShieldCheck,
} from "lucide-react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  admin: "Admin", super_admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", service_coordinator: "Coordinator",
  finance: "Finance", finance_officer: "Finance",
  employee: "Employee", crm: "CRM Agent",
};

const ROLE_COLOR = {
  admin: "bg-orange-500", super_admin: "bg-orange-500",
  supervisor: "bg-blue-500", coordinator: "bg-purple-500",
  service_coordinator: "bg-purple-500", finance: "bg-green-500",
  finance_officer: "bg-green-500", employee: "bg-slate-400",
  crm: "bg-teal-500",
};

const STATUS_BADGE = {
  completed:          "bg-green-100 text-green-700",
  closed:             "bg-green-100 text-green-700",
  approved:           "bg-green-100 text-green-700",
  admin_approved:     "bg-green-100 text-green-700",
  reimbursed:         "bg-purple-100 text-purple-700",
  submitted:          "bg-blue-100 text-blue-700",
  supervisor_approved:"bg-blue-100 text-blue-700",
  finance_approved:   "bg-cyan-100 text-cyan-700",
  in_progress:        "bg-indigo-100 text-indigo-700",
  pending_review:     "bg-yellow-100 text-yellow-700",
  rejected:           "bg-red-100 text-red-700",
  new:                "bg-slate-100 text-slate-600",
  assigned:           "bg-sky-100 text-sky-700",
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function initials(name = "", email = "") {
  const src = name || email || "U";
  return src.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(iso, opts = {}) {
  return new Date(iso).toLocaleDateString("en-IN", opts);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color} bg-opacity-10`}>
        <Icon size={20} className={color.replace("bg-", "text-").replace("-100", "-600")} />
      </div>
      <p className={`text-2xl font-bold ${color.replace("bg-", "text-").replace("-100", "-700")}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-widest">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <Icon size={15} className="text-slate-500" />
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InputField({ label, icon: Icon, type = "text", value, onChange, placeholder, required, min, right }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={min}
          className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition ${Icon ? "pl-9" : ""} ${right ? "pr-16" : ""}`}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Profile() {
  const toast    = useToast();
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [editForm, setEditForm] = useState({ full_name: "", phone: "", department: "", designation: "" });
  const [saving,   setSaving]   = useState(false);

  const [pwForm,   setPwForm]   = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw,   setShowPw]   = useState({ current: false, new: false, confirm: false });

  const [uploading, setUploading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile/");
      setData(res.data);
      const u = res.data.user;
      setEditForm({
        full_name:   u.full_name   || "",
        phone:       u.phone       || "",
        department:  u.department  || "",
        designation: u.designation || "",
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/profile/", editForm);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, full_name: editForm.full_name }));
      toast.success("Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error("Passwords do not match"); return; }
    if (pwForm.new_password.length < 8) { toast.error("Minimum 8 characters required"); return; }
    setPwSaving(true);
    try {
      await api.post("/profile/password", {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      toast.success("Password changed successfully!");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      await api.post("/profile/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Photo updated!");
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-36 bg-gradient-to-r from-blue-200 to-blue-100 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, tasks, expenses, notifications, recent_tasks, recent_expenses } = data;
  const ini = initials(user.full_name, user.email);

  const TABS = [
    { key: "overview", label: "Overview",  icon: Layers },
    { key: "activity", label: "Activity",  icon: TrendingUp },
    { key: "settings", label: "Settings",  icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ══════════════════════════════════════════════════════════════════════
          PROFILE HERO CARD  –  full-width, gradient, never clips the name
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="px-7 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

            {/* LEFT: Avatar + Info */}
            <div className="flex items-center gap-5 min-w-0">

              {/* Avatar with camera overlay */}
              <div className="relative flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold tracking-wide">{ini}</span>
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Change photo"
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-500 hover:bg-blue-400 border-2 border-white rounded-full flex items-center justify-center shadow transition"
                >
                  <Camera size={12} className="text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              {/* Text block — min-w-0 + break-words prevents any clipping */}
              <div className="min-w-0 flex-1">
                {/* Full name — wraps naturally, no truncate */}
                <h1 className="text-white font-bold text-2xl leading-tight break-words">
                  {user.full_name || "—"}
                </h1>

                {/* Designation + Role badge + Department */}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {user.designation && (
                    <span className="flex items-center gap-1 text-blue-200 text-sm">
                      <Briefcase size={13} />
                      {user.designation}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white ${ROLE_COLOR[user.role] || "bg-slate-500"}`}>
                    <ShieldCheck size={11} />
                    {ROLE_LABEL[user.role] || user.role}
                  </span>
                  {user.department && (
                    <span className="flex items-center gap-1 text-blue-300 text-xs">
                      <Tag size={11} />
                      {user.department}
                    </span>
                  )}
                </div>

                {/* Contact row */}
                <div className="flex flex-wrap gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-blue-200 text-xs">
                    <Mail size={12} /> {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1.5 text-blue-200 text-xs">
                      <Phone size={12} /> {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Member since */}
            <div className="flex-shrink-0 text-right sm:text-right text-left">
              <div className="inline-flex flex-col items-end bg-white/10 rounded-xl px-5 py-3 border border-white/20">
                <span className="flex items-center gap-1.5 text-blue-300 text-xs font-medium mb-0.5">
                  <Calendar size={12} /> Member since
                </span>
                <span className="text-white font-bold text-base">
                  {fmtDate(user.created_at, { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2.5 font-medium border-b-2 transition ${
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Task stats */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Task Performance</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={CheckCircle2} label="Completed" value={tasks.completed}
                color="bg-green-100" />
              <StatCard icon={Clock}        label="Pending"   value={tasks.pending}
                color="bg-yellow-100" />
              <StatCard icon={Layers}       label="Total"     value={tasks.total}
                color="bg-slate-100" />
              <StatCard icon={TrendingUp}   label="Efficiency" value={`${tasks.efficiency}%`}
                color="bg-blue-100"
                sub={tasks.total ? `${tasks.completed}/${tasks.total} done` : "No tasks yet"} />
            </div>
          </div>

          {/* Expense stats */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Expense Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard icon={Receipt}     label="Total"      value={expenses.total}    color="bg-slate-100" />
              <StatCard icon={BadgeCheck}  label="Approved"   value={expenses.approved} color="bg-green-100" />
              <StatCard icon={Clock}       label="Pending"    value={expenses.pending}  color="bg-yellow-100" />
              <StatCard icon={XCircle}     label="Rejected"   value={expenses.rejected} color="bg-red-100" />
              <StatCard icon={Wallet}      label="Approved ₹"
                value={`₹${expenses.total_amount.toLocaleString("en-IN")}`} color="bg-purple-100" />
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <SectionCard title="Recent Notifications" icon={Bell}>
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <li key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-xl transition ${n.is_read ? "bg-slate-50" : "bg-blue-50 border border-blue-100"}`}>
                    <Bell size={15} className={n.is_read ? "text-slate-400 mt-0.5 flex-shrink-0" : "text-blue-500 mt-0.5 flex-shrink-0"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(n.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="flex-shrink-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">New</span>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ACTIVITY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "activity" && (
        <div className="grid md:grid-cols-2 gap-5">

          {/* Recent Tasks */}
          <SectionCard title="Recent Tasks" icon={CheckCircle2}>
            {recent_tasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No tasks yet</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent_tasks.map((t) => (
                  <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.title}</p>
                      {t.due_date && (
                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Calendar size={11} />
                          {fmtDate(t.due_date, { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[t.status] || "bg-slate-100 text-slate-600"}`}>
                        {t.status?.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs font-semibold capitalize ${
                        t.priority === "critical" ? "text-red-600" :
                        t.priority === "high"     ? "text-orange-500" :
                        t.priority === "normal"   ? "text-blue-500" : "text-slate-400"
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => navigate("/tasks")}
              className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition">
              View all tasks <ChevronRight size={13} />
            </button>
          </SectionCard>

          {/* Recent Expenses */}
          <SectionCard title="Recent Expenses" icon={Receipt}>
            {recent_expenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No expenses yet</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent_expenses.map((e) => (
                  <li key={e.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{e.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{e.category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold text-slate-800">
                        ₹{parseFloat(e.amount).toLocaleString("en-IN")}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[e.status] || "bg-slate-100 text-slate-600"}`}>
                        {e.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => navigate("/expenses")}
              className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition">
              View all expenses <ChevronRight size={13} />
            </button>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SETTINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="grid md:grid-cols-2 gap-5">

          {/* Edit Profile */}
          <SectionCard title="Edit Profile" icon={Pencil}>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <InputField label="Full Name"   icon={User}     value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Your full name" />
              <InputField label="Phone"       icon={Phone}    value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 9876543210" />
              <InputField label="Department"  icon={Briefcase} value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                placeholder="e.g. Engineering" />
              <InputField label="Designation" icon={Tag}      value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                placeholder="e.g. Senior Engineer" />

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-md">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </SectionCard>

          {/* Change Password */}
          <SectionCard title="Change Password" icon={Lock}>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { key: "current_password", label: "Current Password", pw: "current" },
                { key: "new_password",     label: "New Password",     pw: "new" },
                { key: "confirm_password", label: "Confirm Password", pw: "confirm" },
              ].map(({ key, label, pw }) => (
                <InputField
                  key={key}
                  label={label}
                  icon={Lock}
                  type={showPw[pw] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  placeholder="••••••••"
                  required
                  right={
                    <button type="button"
                      onClick={() => setShowPw({ ...showPw, [pw]: !showPw[pw] })}
                      className="text-slate-400 hover:text-slate-600 transition">
                      {showPw[pw] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              ))}
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-green-500" /> Minimum 8 characters
              </p>
              <button type="submit" disabled={pwSaving}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-md">
                {pwSaving ? "Changing…" : "Change Password"}
              </button>
            </form>
          </SectionCard>

          {/* Photo Upload */}
          <SectionCard title="Profile Photo" icon={Camera}>
            <div className="flex items-center gap-5 mb-5">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow">
                  {ini}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-700">{user.full_name}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <Camera size={11} /> JPG, PNG, WEBP · Max 5 MB
                </p>
              </div>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 text-sm font-medium py-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Camera size={16} />
              {uploading ? "Uploading…" : "Click to upload new photo"}
            </button>
          </SectionCard>

        </div>
      )}
    </div>
  );
}
