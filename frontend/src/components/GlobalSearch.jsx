import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const CATEGORY_ICON = {
  tasks:    "📋",
  expenses: "💸",
  users:    "👥",
  crm:      "🗂️",
};

const CATEGORY_LABEL = {
  tasks:    "Tasks",
  expenses: "Expenses",
  users:    "People",
  crm:      "CRM",
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const navigate   = useNavigate();
  const inputRef   = useRef(null);
  const dropRef    = useRef(null);

  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const debounced = useDebounce(query, 280);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/search/?q=${encodeURIComponent(debounced.trim())}`)
      .then((r) => { setResults(r.data); setOpen(true); })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debounced]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        !inputRef.current?.contains(e.target) &&
        !dropRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (url) => {
    navigate(url);
    setOpen(false);
    setQuery("");
  };

  const hasResults = results && results.total > 0;

  const categories = results
    ? Object.entries(results.results).filter(([, items]) => items.length > 0)
    : [];

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tasks, expenses, people…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (results) setOpen(true); }}
          className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            ⏳
          </span>
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div
          ref={dropRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ maxHeight: 420, overflowY: "auto" }}
        >
          {loading && (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">Searching…</div>
          )}

          {!loading && !hasResults && results !== null && (
            <div className="px-4 py-5 text-xs text-slate-400 text-center">
              No results for <strong className="text-slate-600">"{query}"</strong>
            </div>
          )}

          {!loading && hasResults && categories.map(([cat, items]) => (
            <div key={cat}>
              {/* Category header */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                <span>{CATEGORY_ICON[cat]}</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {CATEGORY_LABEL[cat] || cat}
                </span>
                <span className="ml-auto text-xs text-slate-400">{items.length} result{items.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Items */}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.url)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-slate-100 last:border-0"
                >
                  {cat === "tasks" && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <div className="flex gap-1 flex-shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
                          {item.priority}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">
                          {item.status?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  )}

                  {cat === "expenses" && (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <div className="flex gap-1 items-center flex-shrink-0">
                        <span className="text-sm font-semibold text-slate-700">
                          ₹{parseFloat(item.amount).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">
                          {item.status?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  )}

                  {cat === "users" && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(item.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{item.email} · {item.department}</p>
                      </div>
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 capitalize flex-shrink-0">
                        {item.role?.replace("_", " ")}
                      </span>
                    </div>
                  )}

                  {cat === "crm" && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.customer_name}</p>
                        {item.company_name && (
                          <p className="text-xs text-slate-400 truncate">🏢 {item.company_name}</p>
                        )}
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize flex-shrink-0">
                        {item.status?.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Footer */}
          {hasResults && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-xs text-slate-400">
                {results.total} result{results.total !== 1 ? "s" : ""} found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
