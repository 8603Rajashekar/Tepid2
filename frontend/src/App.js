import { useState } from "react";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AgentDashboard from "./pages/AgentDashboard";

const DASHBOARDS = {
  admin:       AdminDashboard,
  super_admin: AdminDashboard,
  manager:     ManagerDashboard,
  agent:       AgentDashboard,
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole]   = useState(localStorage.getItem("role"));

  const handleLogin = (newToken, newRole) => {
    setToken(newToken);
    setRole(newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const Dashboard = DASHBOARDS[role] || AgentDashboard;
  return <Dashboard onLogout={handleLogout} />;
}

export default App;
