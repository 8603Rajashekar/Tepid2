import { NavLink, useNavigate } from "react-router-dom";
import { TePidIcon } from "../components/TePidLogo";

// ── Nav items per role ────────────────────────────────────────────────────

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
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/users",         label: "Users",         icon: "👥" },
    { to: "/approvals",     label: "Approvals",     icon: "✅", badge: true },
    { to: "/tasks",         label: "Tasks",         icon: "📋" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/expenses",      label: "Expenses",      icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  coordinator: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "Tasks",         icon: "📋" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/expenses",      label: "My Expenses",   icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  finance: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "My Tasks",      icon: "📋" },
    { to: "/approvals",     label: "Approvals",     icon: "✅", badge: true },
    { to: "/expenses",      label: "Expenses",      icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  employee: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "My Tasks",      icon: "📋" },
    { to: "/expenses",      label: "My Expenses",   icon: "💸" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
  ],
  crm: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "My Tasks",      icon: "📋" },
    { to: "/crm",           label: "CRM",           icon: "🗂️" },
    { to: "/expenses",      label: "My Expenses",   icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  service_coordinator: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "Tasks",         icon: "📋" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/expenses",      label: "My Expenses",   icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  finance_officer: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "My Tasks",      icon: "📋" },
    { to: "/approvals",     label: "Approvals",     icon: "✅", badge: true },
    { to: "/expenses",      label: "Expenses",      icon: "💸" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
};

const ROLE_LABEL = {
  admin: "Admin", supervisor: "Supervisor", finance: "Finance",
  coordinator: "Coordinator", employee: "Employee", crm: "CRM Agent",
  super_admin: "Admin", service_coordinator: "Coordinator", finance_officer: "Finance",
};

const ROLE_COLOR = {
  admin: "bg-orange-500", supervisor: "bg-blue-500", finance: "bg-green-500",
  coordinator: "bg-purple-500", employee: "bg-slate-400", crm: "bg-teal-500",
  super_admin: "bg-orange-500", service_coordinator: "bg-purple-500",
  finance_officer: "bg-green-500",
};

// ── Shared nav content — used in both mobile and desktop sidebars ─────────

function SidebarContent({ role, items, isExpanded, onLinkClick, onToggle, onLogout, user, navigate }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Brand + toggle */}
      <div
        onClick={onToggle}
        title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        className="px-3 py-4 border-b border-slate-700/60 cursor-pointer select-none hover:bg-slate-800/50 transition-colors flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <TePidIcon size={36} color="white" />
          </div>
          <div
            style={{
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 160 : 0,
              transition: "opacity 0.2s ease, max-width 0.25s ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
              lineHeight: 1.25,
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

      {/* Role badge */}
      <div className="px-3 py-3 border-b border-slate-700/40 flex-shrink-0">
        <div className={`flex items-center gap-2 ${!isExpanded ? "justify-center" : ""}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_COLOR[role] || "bg-slate-400"}`} />
          <span
            style={{
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 160 : 0,
              transition: "opacity 0.2s ease, max-width 0.25s ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            className="text-xs text-slate-300 font-medium"
          >
            {ROLE_LABEL[role] || role}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={!isExpanded ? item.label : undefined}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-all ${
                !isExpanded ? "justify-center" : ""
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
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? 160 : 0,
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

      {/* User footer */}
      <div className="border-t border-slate-700/60 px-2 py-3 space-y-2 flex-shrink-0">
        <button
          onClick={() => { navigate("/profile"); onLinkClick?.(); }}
          title="My Profile"
          className={`flex items-center gap-2 min-w-0 w-full hover:bg-slate-800/60 rounded-lg px-1 py-1.5 transition ${!isExpanded ? "justify-center" : ""}`}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="avatar"
              className="w-7 h-7 rounded-full object-cover border border-slate-600 flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <span
            style={{
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 140 : 0,
              transition: "opacity 0.2s ease, max-width 0.25s ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            className="text-xs text-slate-300 text-left"
          >
            {user.full_name || user.email || "User"}
          </span>
        </button>

        <button
          onClick={onLogout}
          title="Sign out"
          className={`w-full text-xs text-slate-400 border border-slate-700 hover:border-red-500 hover:text-red-400 py-2 rounded-lg transition-all overflow-hidden ${isExpanded ? "px-3" : ""}`}
        >
          {isExpanded ? "Sign out" : "↩"}
        </button>
      </div>
    </div>
  );
}

// ── Main Sidebar export ───────────────────────────────────────────────────

export default function Sidebar({
  role,
  onLogout,
  mobileOpen,
  onMobileClose,
  desktopExpanded,
  onDesktopToggle,
}) {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const items    = NAV[role] || NAV.employee;

  const sharedProps = { role, items, user, navigate, onLogout };

  return (
    <>
      {/* ── MOBILE drawer (hidden on lg+) ── */}
      <aside
        className={`
          lg:hidden fixed inset-y-0 left-0 z-40 w-72
          flex flex-col bg-slate-900 text-white shadow-2xl
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent
          {...sharedProps}
          isExpanded={true}
          onToggle={onMobileClose}
          onLinkClick={onMobileClose}
        />
      </aside>

      {/* ── DESKTOP sidebar (hidden on <lg) ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-slate-900 text-white shadow-xl overflow-hidden"
        style={{
          width:    desktopExpanded ? 232 : 64,
          minWidth: desktopExpanded ? 232 : 64,
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}
      >
        <SidebarContent
          {...sharedProps}
          isExpanded={desktopExpanded}
          onToggle={onDesktopToggle}
          onLinkClick={null}
        />
      </aside>
    </>
  );
}
