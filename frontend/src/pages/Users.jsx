import { useCallback, useEffect, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

// ── Role config ────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "admin",       label: "Admin",       desc: "Full system access",            icon: "🛡️",  cls: "border-orange-300 bg-orange-50  text-orange-700",  dot: "bg-orange-500"  },
  { value: "supervisor",  label: "Supervisor",  desc: "Team oversight & approvals",    icon: "👁️",  cls: "border-blue-300   bg-blue-50    text-blue-700",    dot: "bg-blue-500"    },
  { value: "coordinator", label: "Coordinator", desc: "Task & service coordination",   icon: "🗂️",  cls: "border-purple-300 bg-purple-50  text-purple-700",  dot: "bg-purple-500"  },
  { value: "employee",    label: "Employee",    desc: "Field operations & tasks",      icon: "👷",  cls: "border-slate-300  bg-slate-50   text-slate-700",   dot: "bg-slate-400"   },
  { value: "finance",     label: "Finance",     desc: "Expense & payment approvals",   icon: "💰",  cls: "border-green-300  bg-green-50   text-green-700",   dot: "bg-green-500"   },
  { value: "crm",         label: "CRM Agent",   desc: "Customer calls & reports",      icon: "📞",  cls: "border-teal-300   bg-teal-50    text-teal-700",    dot: "bg-teal-500"    },
];

const SUPERVISOR_ROLES = ["employee", "coordinator", "crm"];

const ROLE_MAP = Object.fromEntries(ALL_ROLES.map((r) => [r.value, r]));
const fallback = { label: "Unknown", dot: "bg-slate-400", cls: "border-slate-200 bg-slate-50 text-slate-600", icon: "👤" };

const get = (role) => ROLE_MAP[role] || fallback;

const BLANK = { full_name: "", email: "", password: "", role: "employee", phone: "" };

// ── Tiny helpers ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const colors = {
    blue:   "bg-blue-50   border-blue-200   text-blue-700",
    green:  "bg-green-50  border-green-200  text-green-700",
    slate:  "bg-white     border-slate-200  text-slate-700",
    red:    "bg-red-50    border-red-200    text-red-600",
  };
  return (
    <div className={`rounded-2xl border px-5 py-4 ${colors[color] || colors.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = get(role);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${r.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl border border-slate-200" />)}
      </div>
      <div className="h-11 bg-slate-100 rounded-xl border border-slate-200" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-xl border border-slate-200" />)}
    </div>
  );
}

// ── Input row helper ───────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50 hover:bg-white";

// ── Role picker cards ──────────────────────────────────────────────────────
function RolePicker({ value, onChange, roles }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition ${
            value === r.value
              ? `${r.cls} border-current shadow-sm`
              : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
          }`}
        >
          <span className="text-lg leading-none mt-0.5 flex-shrink-0">{r.icon}</span>
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-tight ${value === r.value ? "" : "text-slate-700"}`}>{r.label}</p>
            <p className="text-xs opacity-60 leading-tight mt-0.5 truncate">{r.desc}</p>
          </div>
          {value === r.value && (
            <span className="ml-auto text-xs flex-shrink-0 mt-0.5">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Create / Edit modal ────────────────────────────────────────────────────
function UserModal({ user, allowedRoles, onClose, onSaved }) {
  const toast   = useToast();
  const isEdit  = Boolean(user?.id);
  const [form,   setForm]   = useState(
    isEdit ? { full_name: user.full_name, phone: user.phone || "", role: user.role } : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/users/${user.id}`, {
          full_name: form.full_name || undefined,
          phone:     form.phone    || undefined,
          role:      form.role,
        });
        toast.success("User updated successfully");
      } else {
        await api.post("/users/", {
          full_name: form.full_name,
          email:     form.email,
          password:  form.password,
          role:      form.role,
          phone:     form.phone || undefined,
        });
        toast.success("User created successfully");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? "Edit User" : "New User"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? "Update details or change the role" : "Fill in the details to create an account"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Name */}
          <Field label="Full Name" required>
            <input required placeholder="e.g. Ravi Kumar" className={inputCls}
              value={form.full_name} onChange={(e) => f("full_name", e.target.value)} />
          </Field>

          {/* Email + Password — create only */}
          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email Address" required>
                <input required type="email" placeholder="ravi@company.com" className={inputCls}
                  value={form.email} onChange={(e) => f("email", e.target.value)} />
              </Field>
              <Field label="Password" required>
                <div className="relative">
                  <input required minLength={8} placeholder="Min 8 characters"
                    type={showPw ? "text" : "password"}
                    className={inputCls + " pr-10"}
                    value={form.password} onChange={(e) => f("password", e.target.value)} />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>
            </div>
          )}

          {/* Phone */}
          <Field label="Phone Number">
            <input type="tel" placeholder="+91 98765 43210" className={inputCls}
              value={form.phone} onChange={(e) => f("phone", e.target.value)} />
          </Field>

          {/* Role picker */}
          <Field label="Role" required>
            <RolePicker value={form.role} onChange={(v) => f("role", v)} roles={allowedRoles} />
          </Field>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition font-medium">
            Cancel
          </button>
          <button
            form="user-form"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold disabled:opacity-60 shadow-sm">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Users() {
  const toast        = useToast();
  const myRole       = localStorage.getItem("role") || "";
  const isSupervisor = myRole === "supervisor";
  const allowedRoles = isSupervisor
    ? ALL_ROLES.filter((r) => SUPERVISOR_ROLES.includes(r.value))
    : ALL_ROLES;

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteId,   setDeleteId]   = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/users/");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? "User deactivated" : "User activated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success("User deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Team Members</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage user accounts, roles, and access levels
          </p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm flex-shrink-0">
          <span className="text-base leading-none">+</span>
          New User
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={users.length}   color="slate" />
        <StatCard label="Active"         value={activeCount}    color="green" />
        <StatCard label="Inactive"       value={inactiveCount}  color={inactiveCount > 0 ? "red" : "slate"} />
        <StatCard
          label="Roles in Use"
          value={new Set(users.map((u) => u.role)).size}
          sub={`of ${ALL_ROLES.length} total`}
          color="blue"
        />
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            placeholder="Search by name or email…"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 hover:bg-white transition"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-700"
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* ── User table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl mb-4">👥</div>
            <p className="font-semibold text-slate-600">No users found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-widest w-1/3">Member</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Phone</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((u) => {
                const r = get(u.role);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition group">
                    {/* Member */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 border ${r.cls}`}>
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{u.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-4 text-slate-500 text-xs">
                      {u.phone || <span className="text-slate-300">—</span>}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-4">
                      <button onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border transition ${
                          u.is_active
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-slate-400"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setModal(u)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          Edit
                        </button>
                        <button onClick={() => setDeleteId(u.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      {modal && (
        <UserModal
          user={modal === "create" ? null : modal}
          allowedRoles={allowedRoles}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-xl mb-4">⚠️</div>
            <h2 className="font-bold text-slate-800 text-base mb-1">Remove this user?</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Their account will be permanently deleted and they will lose all access to the system.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition font-medium">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
