import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

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
        setError(`Cannot reach backend at ${process.env.REACT_APP_API_URL} — is the server running?`);
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-10">

        {/* Logo / Brand */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-800">Field Ops Platform</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
        <p className="text-sm text-slate-500 mb-7">Sign in to your dashboard</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-lg text-sm transition cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400 text-center font-medium mb-2">
            Quick login — password: <span className="font-mono text-slate-500">Password@123</span>
          </p>
          <div className="grid grid-cols-2 gap-1">
            {[
              ["admin@company.com",        "admin"],
              ["supervisor@company.com",   "supervisor"],
              ["coordinator@company.com",  "coordinator"],
              ["finance@company.com",      "finance"],
              ["employee@company.com",     "employee"],
            ].map(([e, label]) => (
              <button
                key={e}
                type="button"
                onClick={() => { setEmail(e); setPassword("Password@123"); }}
                className="text-left text-xs px-2 py-1.5 rounded hover:bg-slate-50 text-slate-500 transition font-mono truncate"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
