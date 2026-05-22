import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "info") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    success: (msg) => add(msg, "success"),
    error:   (msg) => add(msg, "error"),
    info:    (msg) => add(msg, "info"),
    warning: (msg) => add(msg, "warning"),
  }), [add]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast stack — bottom-right */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium cursor-pointer transition-all
              ${t.type === "success" ? "bg-green-50  border-green-200  text-green-800"  : ""}
              ${t.type === "error"   ? "bg-red-50    border-red-200    text-red-800"    : ""}
              ${t.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" : ""}
              ${t.type === "info"    ? "bg-blue-50   border-blue-200   text-blue-800"   : ""}
            `}
          >
            <span className="mt-0.5 flex-shrink-0">
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}
            </span>
            <p className="flex-1 leading-snug">{t.message}</p>
            <span className="text-xs opacity-50 mt-0.5">✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
