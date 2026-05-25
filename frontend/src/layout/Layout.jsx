import Sidebar from "./Sidebar";
import NotificationBell from "../components/NotificationBell";

export default function Layout({ role, onLogout, children }) {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar role={role} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-end px-5 flex-shrink-0 shadow-sm">
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
