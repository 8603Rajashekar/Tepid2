import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/api";

const POLL_MS = 30_000; // refresh every 30 s

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifs(res.data);
    } catch {
      // silently ignore — bell failure shouldn't break the app
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetch();
    const t = setInterval(fetch, POLL_MS);
    return () => clearInterval(t);
  }, [fetch]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter((n) => !n.is_read).length;

  const markOne = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      setNotifs((prev) => prev.map((n) => (n.id === id ? res.data : n)));
    } catch { /* ignore */ }
  };

  const markAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.post("/notifications/read-all");
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) fetch(); // refresh when opening
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAll}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition disabled:opacity-50"
              >
                {loading ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-400">
                <p className="text-2xl mb-1">🔔</p>
                No notifications yet
              </li>
            ) : (
              notifs.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.is_read && markOne(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    n.is_read
                      ? "bg-white hover:bg-slate-50"
                      : "bg-blue-50/60 hover:bg-blue-50"
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <span className={`block w-2 h-2 rounded-full ${n.is_read ? "bg-transparent" : "bg-blue-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? "text-slate-600" : "text-slate-800 font-medium"}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
              <span className="text-xs text-slate-400">Showing last {notifs.length} notifications</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
