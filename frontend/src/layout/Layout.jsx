import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "../components/NotificationBell";
import GlobalSearch from "../components/GlobalSearch";

export default function Layout({ role, onLogout, children }) {
  // Mobile: drawer open/close
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Desktop: sidebar collapsed/expanded
  const [desktopExpanded, setDesktopExpanded] = useState(true);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = (user.full_name || user.email || "U")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex bg-gray-100 min-h-screen">

      {/* ── Mobile backdrop — tap to close sidebar ── */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        role={role}
        onLogout={onLogout}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        desktopExpanded={desktopExpanded}
        onDesktopToggle={() => setDesktopExpanded((e) => !e)}
      />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-3 sm:px-5 flex-shrink-0 shadow-sm">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Global search */}
          <GlobalSearch />

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <NotificationBell />

            {/* Profile */}
            <button
              onClick={() => navigate("/profile")}
              title="My Profile"
              className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-1.5 py-1 transition"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
              )}
              <span className="hidden sm:block text-xs font-medium text-slate-600 max-w-[100px] truncate">
                {user.full_name || "Profile"}
              </span>
            </button>
          </div>
        </header>

        {/* Page content — responsive padding */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
