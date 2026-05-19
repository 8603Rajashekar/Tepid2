import { NavLink } from "react-router-dom";

const NAV = {
  super_admin: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "Tasks",         icon: "✅" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
    { to: "/team",          label: "Team",          icon: "👥" },
  ],
  admin: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "Tasks",         icon: "✅" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
    { to: "/team",          label: "Team",          icon: "👥" },
  ],
  supervisor: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/tasks",         label: "Tasks",         icon: "✅" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  coordinator: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/service-calls", label: "Service Calls", icon: "📞" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
  ],
  finance: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
  ],
  employee: [
    { to: "/tasks",         label: "My Tasks",      icon: "✅" },
    { to: "/work-reports",  label: "Work Reports",  icon: "📝" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
  ],
  viewer: [
    { to: "/",              label: "Dashboard",     icon: "📊" },
    { to: "/documents",     label: "Documents",     icon: "📄" },
  ],
};

const ROLE_LABEL = {
  super_admin: "Super Admin", admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", finance: "Finance", employee: "Employee",
  viewer: "Viewer",
};

export default function Sidebar({ role, onLogout }) {
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const items = NAV[role] || NAV.viewer;

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">⚙</div>
          <div>
            <p className="text-sm font-bold leading-none">Field Ops</p>
            <p className="text-xs text-slate-400 mt-0.5">{ROLE_LABEL[role] || role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 truncate mb-2">{user.full_name || user.email}</p>
        <button
          onClick={onLogout}
          className="w-full text-xs text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-white py-1.5 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
