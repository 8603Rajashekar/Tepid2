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
      const primaryRole = user.roles[0] || "agent";

      localStorage.setItem("token", access_token);
      localStorage.setItem("role", primaryRole);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(access_token, primaryRole);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#f1f5f9",
    }}>
      <div style={{
        background: "white", padding: "40px 48px", borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", minWidth: 340,
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Field Ops Platform</h2>
        <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: 14 }}>
          Sign in to your dashboard
        </p>

        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle} type="email" placeholder="admin@company.com"
          value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown}
        />

        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle} type="password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown}
        />

        {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 16px" }}>{error}</p>}

        <button
          style={{
            width: "100%", padding: "10px 0",
            background: loading ? "#94a3b8" : "#3b82f6",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleLogin} disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
          admin / manager / agent@company.com
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle = {
  width: "100%", padding: "9px 12px", marginBottom: 18,
  border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14,
  boxSizing: "border-box", outline: "none",
};
