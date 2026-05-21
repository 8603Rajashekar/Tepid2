import { useState } from "react";
import TasksApproval    from "../components/approvals/TasksApproval";
import ExpensesApproval from "../components/approvals/ExpensesApproval";
import DocumentsApproval from "../components/approvals/DocumentsApproval";
import ServiceApproval  from "../components/approvals/ServiceApproval";

const TABS = [
  { key: "tasks",     label: "Tasks",           icon: "✅" },
  { key: "expenses",  label: "Expenses",         icon: "💸" },
  { key: "documents", label: "Documents",        icon: "📄" },
  { key: "calls",     label: "Service Closures", icon: "📞" },
];

function Tab({ value, label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export default function Approvals() {
  const [tab, setTab] = useState("tasks");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Approval Center</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Review and action all pending items from one place
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            label={t.label}
            icon={t.icon}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {/* Content panel */}
      <div>
        {tab === "tasks"     && <TasksApproval />}
        {tab === "expenses"  && <ExpensesApproval />}
        {tab === "documents" && <DocumentsApproval />}
        {tab === "calls"     && <ServiceApproval />}
      </div>
    </div>
  );
}
