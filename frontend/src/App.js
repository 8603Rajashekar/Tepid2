import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApprovalQueue from "./pages/ApprovalQueue";
import TeamOverview from "./pages/TeamOverview";
import ServiceDashboard from "./pages/ServiceDashboard";
import DocumentsPage from "./pages/DocumentsPage";
import WorkReportsPage from "./pages/WorkReportsPage";
import AgentDashboard from "./pages/AgentDashboard";
import Sidebar from "./components/Sidebar";

const PRIVILEGED          = new Set(["admin", "super_admin", "supervisor", "manager"]);
const SERVICE_CALLS_ROLES = new Set(["super_admin", "admin", "supervisor", "coordinator"]);

function Layout({ role, onLogout, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} onLogout={onLogout} />
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-5">{children}</div>
      </main>
    </div>
  );
}

function PrivilegedOnly({ role, children }) {
  return PRIVILEGED.has(role) ? children : <Navigate to="/" replace />;
}

export default function App() {
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

  const isEmployee = role === "employee" || role === "agent";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout role={role} onLogout={handleLogout}>
              {isEmployee ? <AgentDashboard onLogout={handleLogout} /> : <Dashboard />}
            </Layout>
          }
        />
        <Route
          path="/approvals"
          element={
            <PrivilegedOnly role={role}>
              <Layout role={role} onLogout={handleLogout}>
                <ApprovalQueue />
              </Layout>
            </PrivilegedOnly>
          }
        />
        <Route
          path="/team"
          element={
            <PrivilegedOnly role={role}>
              <Layout role={role} onLogout={handleLogout}>
                <TeamOverview />
              </Layout>
            </PrivilegedOnly>
          }
        />
        <Route
          path="/service-calls"
          element={
            SERVICE_CALLS_ROLES.has(role)
              ? <Layout role={role} onLogout={handleLogout}><ServiceDashboard /></Layout>
              : <Navigate to="/" replace />
          }
        />
        <Route
          path="/documents"
          element={
            <Layout role={role} onLogout={handleLogout}>
              <DocumentsPage />
            </Layout>
          }
        />
        <Route
          path="/work-reports"
          element={
            <Layout role={role} onLogout={handleLogout}>
              <WorkReportsPage />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
