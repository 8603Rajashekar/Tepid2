import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login         from "./pages/Login";
import Layout        from "./layout/Layout";

import Dashboard     from "./pages/Dashboard";
import Tasks         from "./pages/Tasks";
import ServiceCalls  from "./pages/ServiceCalls";
import WorkDashboard from "./pages/WorkDashboard";
import CreateReport  from "./pages/CreateReport";
import Documents     from "./pages/Documents";

// Roles that get the full sidebar + dashboard
const FULL_ACCESS  = new Set(["super_admin", "admin", "supervisor", "coordinator", "finance", "viewer"]);
const SERVICE_ROLES = new Set(["super_admin", "admin", "supervisor", "coordinator"]);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role,  setRole]  = useState(localStorage.getItem("role"));

  const handleLogin = (tok, r) => { setToken(tok); setRole(r); };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  const wrap = (page) => (
    <Layout role={role} onLogout={handleLogout}>
      {page}
    </Layout>
  );

  // Employees get tasks + their own documents + work reports
  const isEmployee = role === "employee" || role === "agent";
  const homeRoute  = isEmployee ? "/tasks" : "/";

  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard — privileged only */}
        <Route
          path="/"
          element={FULL_ACCESS.has(role) ? wrap(<Dashboard />) : <Navigate to="/tasks" replace />}
        />

        {/* Tasks — all roles */}
        <Route path="/tasks" element={wrap(<Tasks />)} />

        {/* Service Calls */}
        <Route
          path="/service-calls"
          element={SERVICE_ROLES.has(role) ? wrap(<ServiceCalls />) : <Navigate to={homeRoute} replace />}
        />

        {/* Documents — all roles */}
        <Route path="/documents" element={wrap(<Documents />)} />

        {/* Work Reports */}
        <Route path="/work-reports" element={wrap(<WorkDashboard />)} />
        <Route path="/report"       element={wrap(<CreateReport  />)} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={homeRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
