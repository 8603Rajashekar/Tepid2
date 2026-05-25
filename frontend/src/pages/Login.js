import { useState } from "react";
import axios from "axios";
import { TePidIcon } from "../components/TePidLogo";

const NAVY = "#1B2D6B";

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPw,   setShowPw]   = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/v1/auth/login`,
        { email, password }
      );
      const { access_token, user } = res.data;
      const primaryRole = user.role || user.roles?.[0] || "employee";
      localStorage.setItem("token", access_token);
      localStorage.setItem("role", primaryRole);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(access_token, primaryRole);
    } catch (err) {
      if (err.response) {
        setError(err.response?.data?.detail || `Server error ${err.response.status}`);
      } else if (err.request) {
        setError(`Cannot reach server — is the backend running?`);
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] flex-shrink-0 p-12"
        style={{ background: `linear-gradient(155deg, ${NAVY} 0%, #2a4a9e 100%)` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <TePidIcon size={40} color="white" />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 0.4,
              whiteSpace: "nowrap",
            }}>
              TePid
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(255,255,255,0.60)",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
            }}>
              Industries PVT LTD
            </div>
          </div>
        </div>

        {/* Center content */}
        <div>
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">
            Enterprise Field Operations
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            One platform.<br />Every operation.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Manage tasks, service calls, expenses, and your team — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["Tasks", "CRM", "Expenses", "Documents", "Work Reports", "Approvals"].map((f) => (
              <span key={f}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} TePid Industries</p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo (hidden on large screens) */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <TePidIcon size={64} color={NAVY} />
            <div style={{ marginTop: 10, textAlign: "center", lineHeight: 1.3 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: NAVY,
                letterSpacing: 0.4,
              }}>
                TePid
              </div>
              <div style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "#64748b",
                letterSpacing: 0.5,
              }}>
                Industries PVT LTD
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to your workspace</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": NAVY + "80" }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-3 pr-16 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="mt-6 w-full py-3 rounded-xl text-white text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ background: loading ? "#94a3b8" : NAVY }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {/* Dev quick-login */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-400 font-semibold text-center mb-3">
              Quick login — password: <span className="font-mono text-slate-500">Password@123</span>
            </p>
            <div className="grid grid-cols-2 gap-1">
              {[
                ["admin@company.com",       "Admin"],
                ["supervisor@company.com",  "Supervisor"],
                ["coordinator@company.com", "Coordinator"],
                ["finance@company.com",     "Finance"],
                ["employee@company.com",    "Employee"],
              ].map(([e, label]) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmail(e); setPassword("Password@123"); }}
                  className="text-left text-xs px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
