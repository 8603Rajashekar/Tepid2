import { NavLink } from "react-router-dom";
import { TePidIcon } from "../components/TePidLogo";

// Nav items per role — ordered by priority
const ADMIN_NAV = [
  { to: "/",              label: "Dashboard",      icon: "📊" },
  { to: "/users",         label: "Users",          icon: "👥" },
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
    { to: "/users",         label: "Users",          icon: "👥" },
    { to: "/approvals",     label: "Approvals",      icon: "✅", badge: true },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "Expenses",       icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  coordinator: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  finance: [
    { to: "/tasks",         label: "My Tasks",       icon: "📋" },
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
    { to: "/tasks",         label: "My Tasks",       icon: "📋" },
    { to: "/crm",           label: "CRM",            icon: "🗂️" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  service_coordinator: [
    { to: "/",              label: "Dashboard",      icon: "📊" },
    { to: "/tasks",         label: "Tasks",          icon: "📋" },
    { to: "/service-calls", label: "Service Calls",  icon: "📞" },
    { to: "/expenses",      label: "My Expenses",    icon: "💸" },
    { to: "/documents",     label: "Documents",      icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",   icon: "📝" },
  ],
  finance_officer: [
    { to: "/tasks",         label: "My Tasks",       icon: "📋" },
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
  super_admin:         "bg-orange-500",
  service_coordinator: "bg-purple-500",
  finance_officer:     "bg-green-500",
};

export default function Sidebar({ role, onLogout, isOpen, onToggle }) {
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const items = NAV[role] || NAV.employee;

  return (
    <aside
      style={{
        width: isOpen ? 232 : 64,
        minWidth: isOpen ? 232 : 64,
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
      className="bg-slate-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-xl overflow-hidden"
    >
      {/* ── Brand / Toggle ── */}
      <div
        onClick={onToggle}
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="px-3 py-4 border-b border-slate-700/60 cursor-pointer select-none hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Logo always visible */}
          <div className="flex-shrink-0">
            <TePidIcon size={36} color="white" />
          </div>

          {/* Company name — visible only when expanded */}
          <div
            style={{
              opacity: isOpen ? 1 : 0,
              transition: "opacity 0.2s ease",
              lineHeight: 1.25,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", letterSpacing: 0.4 }}>
              TePid
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 500, color: "rgba(255,255,255,0.60)", letterSpacing: 0.5 }}>
              Industries PVT LTD
            </div>
          </div>
        </div>
      </div>

      {/* ── Role badge ── */}
      <div className="px-3 py-3 border-b border-slate-700/40">
        <div className={`flex items-center gap-2 ${!isOpen ? "justify-center" : ""}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_COLOR[role] || "bg-slate-400"}`} />
          <span
            style={{
              opacity: isOpen ? 1 : 0,
              transition: "opacity 0.2s ease",
              whiteSpace: "nowrap",
            }}
            className="text-xs text-slate-300 font-medium overflow-hidden"
          >
            {ROLE_LABEL[role] || role}
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={!isOpen ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                !isOpen ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span className="text-base w-5 flex-shrink-0 text-center">{item.icon}</span>
            <span
              style={{
                opacity: isOpen ? 1 : 0,
                maxWidth: isOpen ? 160 : 0,
                transition: "opacity 0.2s ease, max-width 0.25s ease",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className={`border-t border-slate-700/60 px-2 py-3 space-y-2`}>
        <div className={`flex items-center gap-2 min-w-0 ${!isOpen ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <p
            style={{
              opacity: isOpen ? 1 : 0,
              maxWidth: isOpen ? 140 : 0,
              transition: "opacity 0.2s ease, max-width 0.25s ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            className="text-xs text-slate-300"
          >
            {user.full_name || user.email || "User"}
          </p>
        </div>

        <button
          onClick={onLogout}
          title="Sign out"
          className="w-full text-xs text-slate-400 border border-slate-700 hover:border-red-500 hover:text-red-400 py-2 rounded-lg transition-all overflow-hidden"
        >
          <span style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.15s ease" }}>
            {isOpen ? "Sign out" : ""}
          </span>
          {!isOpen && <span>↩</span>}
        </button>
      </div>
    </aside>
  );
}
