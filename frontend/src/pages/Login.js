import { useState } from "react";
import axios from "axios";
import { TePidIcon } from "../components/TePidLogo";

const NAVY = "#1B2D6B";

export default function Login({ onLogin }) {
  const [loginMode, setLoginMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const saveSession = (data) => {
    const { access_token, user } = data;
    const primaryRole = user.role || user.roles?.[0] || "employee";
    localStorage.setItem("token", access_token);
    localStorage.setItem("role", primaryRole);
    localStorage.setItem("user", JSON.stringify(user));
    onLogin(access_token, primaryRole);
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/auth/login`, {
        email,
        password,
      });
      saveSession(res.data);
    } catch (err) {
      if (err.response) {
        setError(err.response?.data?.detail || `Server error ${err.response.status}`);
      } else if (err.request) {
        setError("Cannot reach server - is the backend running?");
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpRequest = async () => {
    setError("");
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/auth/login/mobile/request-otp`, {
        mobile,
      });
      setOtpSent(true);
    } catch (err) {
      if (err.response) {
        setError(err.response?.data?.detail || `Server error ${err.response.status}`);
      } else if (err.request) {
        setError("Cannot reach server - is the backend running?");
      } else {
        setError(err.message || "OTP request failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/auth/login/mobile/verify-otp`, {
        mobile,
        otp,
      });
      saveSession(res.data);
    } catch (err) {
      if (err.response) {
        setError(err.response?.data?.detail || `Server error ${err.response.status}`);
      } else if (err.request) {
        setError("Cannot reach server - is the backend running?");
      } else {
        setError(err.message || "OTP verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (loginMode === "password") return handleLogin();
    return otpSent ? handleOtpVerify() : handleOtpRequest();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] flex-shrink-0 p-12"
        style={{ background: `linear-gradient(155deg, ${NAVY} 0%, #2a4a9e 100%)` }}
      >
        <div className="flex items-center gap-3">
          <TePidIcon size={40} color="white" />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              TePid
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.60)", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
              Industries PVT LTD
            </div>
          </div>
        </div>

        <div>
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">
            Enterprise Field Operations
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            One platform.<br />Every operation.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Manage tasks, service calls, expenses, and your team - all in one place.
          </p>
        </div>

        <p className="text-white/30 text-xs">Copyright {new Date().getFullYear()} TePid Industries</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <TePidIcon size={64} color={NAVY} />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to your workspace</p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${loginMode === "password" ? "bg-slate-100 text-slate-800" : "text-slate-500"}`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("otp");
                setError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${loginMode === "otp" ? "bg-slate-100 text-slate-800" : "text-slate-500"}`}
            >
              Mobile OTP
            </button>
          </div>

          <div className="space-y-5">
            {loginMode === "password" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 pr-16 border border-slate-200 rounded-xl text-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+91XXXXXXXXXX"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"
                  />
                </div>
                {otpSent && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">OTP</label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (loginMode === "password" && (!email || !password)) ||
              (loginMode === "otp" && (!mobile || (otpSent && !otp)))
            }
            className="mt-6 w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: loading ? "#94a3b8" : NAVY }}
          >
            {loading
              ? "Please wait..."
              : loginMode === "otp"
                ? (otpSent ? "Verify OTP" : "Send OTP")
                : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
