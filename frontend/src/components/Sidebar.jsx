import { NavLink } from "react-router-dom";

const ROLE_NAV = {
  super_admin: [
    { to: "/",               label: "Dashboard" },
    { to: "/approvals",      label: "Approval Queue" },
    { to: "/team",           label: "Team Overview" },
    { to: "/service-calls",  label: "Service Calls" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  admin: [
    { to: "/",               label: "Dashboard" },
    { to: "/approvals",      label: "Approval Queue" },
    { to: "/team",           label: "Team Overview" },
    { to: "/service-calls",  label: "Service Calls" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  supervisor: [
    { to: "/",               label: "Dashboard" },
    { to: "/approvals",      label: "Approval Queue" },
    { to: "/team",           label: "Team Overview" },
    { to: "/service-calls",  label: "Service Calls" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  manager: [
    { to: "/",               label: "Dashboard" },
    { to: "/approvals",      label: "Approval Queue" },
    { to: "/team",           label: "Team Overview" },
    { to: "/service-calls",  label: "Service Calls" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  coordinator: [
    { to: "/",               label: "Dashboard" },
    { to: "/service-calls",  label: "Service Calls" },
    { to: "/documents",      label: "Documents" },
  ],
  finance: [
    { to: "/",               label: "Dashboard" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  employee: [
    { to: "/",               label: "My Tasks" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
  agent: [
    { to: "/",               label: "My Tasks" },
    { to: "/documents",      label: "Documents" },
    { to: "/work-reports",   label: "Work Reports" },
  ],
};

const ROLE_LABEL = {
  super_admin: "Super Admin", admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", finance: "Finance", employee: "Employee",
  agent: "Agent", manager: "Manager",
};

export default function Sidebar({ role, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navItems = ROLE_NAV[role] || ROLE_NAV.employee;

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0 h-screen">
      <div className="px-5 py-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold">Field Ops</div>
            <div className="text-xs text-slate-400">{ROLE_LABEL[role] || role}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-3 truncate">{user.full_name || user.email}</div>
        <button
          onClick={onLogout}
          className="w-full text-xs text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200 py-1.5 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
