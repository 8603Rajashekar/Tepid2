import { NavLink } from "react-router-dom";

// Nav items per role — ordered by priority
const ADMIN_NAV = [
  { to: "/",              label: "Dashboard",      icon: "📊" },
  { to: "/approvals",     label: "Approvals",      icon: "✅", badge: true },
  { to: "/tasks",         label: "Tasks",          icon: "📋" },
  { to: "/crm",           label: "CRM",            icon: "🗂️" },
  { to: "/service-calls", label: "Service Calls",  icon: "📞" },
  { to: "/expenses",      label: "Expenses",       icon: "💸" },
  { to: "/documents",     label: "Documents",      icon: "📄" },
  { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
];

const NAV = {
  admin:       ADMIN_NAV,
  super_admin: ADMIN_NAV,
  supervisor: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/approvals",     label: "Approvals",      icon: "✅", badge: true },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/crm",           label: "CRM",            icon: "🗂️" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "Expenses",       icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  coordinator: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/crm",           label: "CRM",            icon: "🗂️" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
  ],
  finance: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/approvals",     label: "Approvals",      icon: "✅", badge: true },
    { to: "/expenses",      label: "Expenses",       icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  employee: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/tasks",         label: "My Tasks",       icon: "📋" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
  ],
  crm: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/crm",           label: "CRM",            icon: "🗂️" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
  ],
  // legacy aliases
  service_coordinator: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
  ],
  finance_officer: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/approvals",     label: "Approvals",      icon: "✅", badge: true },
    { to: "/expenses",      label: "Expenses",       icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
};

const ROLE_LABEL = {
  admin:               "Admin",
  supervisor:          "Supervisor",
  finance:             "Finance",
  coordinator:         "Coordinator",
  employee:            "Employee",
  crm:                 "CRM Agent",
  // legacy
  super_admin:         "Admin",
  service_coordinator: "Coordinator",
  finance_officer:     "Finance",
};

const ROLE_COLOR = {
  admin:               "bg-orange-500",
  supervisor:          "bg-blue-500",
  finance:             "bg-green-500",
  coordinator:         "bg-purple-500",
  employee:            "bg-slate-400",
  crm:                 "bg-teal-500",
  // legacy
  super_admin:         "bg-orange-500",
  service_coordinator: "bg-purple-500",
  finance_officer:     "bg-green-500",
};

export default function Sidebar({ role, onLogout }) {
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const items = NAV[role] || NAV.employee;

  return (
    <aside className="w-58 bg-slate-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-xl">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-base shadow-md flex-shrink-0">
            ⚙
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Field Ops</p>
            <p className="text-xs text-slate-400 leading-tight mt-0.5">Platform</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_COLOR[role] || "bg-slate-400"}`} />
          <span className="text-xs text-slate-300 font-medium">{ROLE_LABEL[role] || role}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span className="text-base w-5 flex-shrink-0 text-center">{item.icon}</span>
            <span className="flex-1 leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/60 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <p className="text-xs text-slate-300 truncate">{user.full_name || user.email || "User"}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-xs text-slate-400 border border-slate-700 hover:border-red-500 hover:text-red-400 py-2 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
