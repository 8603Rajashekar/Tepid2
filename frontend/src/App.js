import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ToastProvider } from "./context/ToastContext";
import Login         from "./pages/Login";
import Layout        from "./layout/Layout";

import Dashboard         from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Tasks             from "./pages/Tasks";
import ServiceCalls  from "./pages/ServiceCalls";
import WorkDashboard from "./pages/WorkDashboard";
import CreateReport  from "./pages/CreateReport";
import Documents     from "./pages/Documents";
import Expenses      from "./pages/Expenses";
import Approvals     from "./pages/Approvals";
import CRM           from "./pages/CRM";

// Role sets for route guards
const FULL_ACCESS    = new Set(["admin", "super_admin", "supervisor", "coordinator", "finance", "service_coordinator", "finance_officer", "crm"]);
const SERVICE_ROLES  = new Set(["admin", "super_admin", "supervisor", "coordinator", "service_coordinator", "crm"]);
const APPROVAL_ROLES = new Set(["admin", "super_admin", "supervisor", "finance", "finance_officer"]);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role,  setRole]  = useState(localStorage.getItem("role"));

  const handleLogin  = (tok, r) => { setToken(tok); setRole(r); };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
  };

  if (!token) return <ToastProvider><Login onLogin={handleLogin} /></ToastProvider>;

  const wrap = (page) => (
    <Layout role={role} onLogout={handleLogout}>{page}</Layout>
  );

  const isEmployee = role === "employee" || role === "agent" || !FULL_ACCESS.has(role);
  const homeRoute  = "/";

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Dashboard — role-based */}
          <Route path="/"
            element={
              isEmployee
                ? wrap(<EmployeeDashboard />)
                : FULL_ACCESS.has(role)
                ? wrap(<Dashboard />)
                : <Navigate to="/tasks" replace />
            }
          />

          {/* Tasks — all roles */}
          <Route path="/tasks" element={wrap(<Tasks />)} />

          {/* Service Calls — coordinator / supervisor / admin */}
          <Route path="/service-calls"
            element={SERVICE_ROLES.has(role) ? wrap(<ServiceCalls />) : <Navigate to={homeRoute} replace />}
          />

          {/* Expenses — all roles (employees see own, finance sees all) */}
          <Route path="/expenses" element={wrap(<Expenses />)} />

          {/* Approval Center — managers / finance only */}
          <Route path="/approvals"
            element={APPROVAL_ROLES.has(role) ? wrap(<Approvals />) : <Navigate to={homeRoute} replace />}
          />

          {/* Documents — all roles */}
          <Route path="/documents" element={wrap(<Documents />)} />

          {/* Work Reports */}
          <Route path="/work-reports" element={wrap(<WorkDashboard />)} />
          <Route path="/report"       element={wrap(<CreateReport />)} />

          {/* CRM — coordinator / admin / supervisor */}
          <Route path="/crm" element={wrap(<CRM />)} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={homeRoute} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
