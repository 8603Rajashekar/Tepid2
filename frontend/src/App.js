import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ToastProvider } from "./context/ToastContext";
import Login         from "./pages/Login";
import Layout        from "./layout/Layout";

import Dashboard         from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import CRMDashboard      from "./pages/CRMDashboard";
import Tasks             from "./pages/Tasks";
import ServiceCalls  from "./pages/ServiceCalls";
import CreateReport  from "./pages/CreateReport";
import Documents     from "./pages/Documents";
import Expenses      from "./pages/Expenses";
import Approvals     from "./pages/Approvals";
import CRM           from "./pages/CRM";
import Users         from "./pages/Users";
import Profile        from "./pages/Profile";
import WorkReportsPage from "./pages/WorkReportsPage";

// Role sets for route guards
const FULL_ACCESS    = new Set(["admin", "super_admin", "supervisor", "coordinator", "service_coordinator", "crm"]);
const SERVICE_ROLES  = new Set(["admin", "super_admin", "supervisor", "coordinator", "service_coordinator"]);
const APPROVAL_ROLES = new Set(["admin", "super_admin", "supervisor", "finance", "finance_officer"]);
const CRM_ROLES      = new Set(["admin", "super_admin", "crm"]);

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

  const isEmployee = role === "employee" || role === "agent";
  const isCRM      = role === "crm";
  const isFinance  = role === "finance" || role === "finance_officer";
  const homeRoute  = "/";

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Dashboard — role-based */}
          <Route path="/"
            element={
              isCRM
                ? wrap(<CRMDashboard />)
                : isEmployee
                ? wrap(<EmployeeDashboard />)
                : wrap(<Dashboard />)
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

          {/* Work Reports — all roles */}
          <Route path="/work-reports" element={wrap(<WorkReportsPage />)} />
          <Route path="/report"       element={wrap(<CreateReport />)} />

          {/* CRM — admin / super_admin / crm agent only */}
          <Route path="/crm"
            element={CRM_ROLES.has(role) ? wrap(<CRM />) : <Navigate to={homeRoute} replace />}
          />

          {/* User Management — admin + supervisor */}
          <Route path="/users"
            element={["admin", "super_admin", "supervisor"].includes(role) ? wrap(<Users />) : <Navigate to={homeRoute} replace />}
          />

          {/* Profile — all authenticated users */}
          <Route path="/profile" element={wrap(<Profile />)} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={homeRoute} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
