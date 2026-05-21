const STYLE = {
  uploaded: { cls: "bg-slate-100 text-slate-600",   label: "Uploaded"       },
  review:   { cls: "bg-blue-100  text-blue-700",    label: "In Review"      },
  signing:  { cls: "bg-purple-100 text-purple-700", label: "E-Sign Pending" },
  esign:    { cls: "bg-purple-100 text-purple-700", label: "E-Sign Pending" },
  signed:   { cls: "bg-indigo-100 text-indigo-700", label: "Signed"         },
  approved: { cls: "bg-green-100 text-green-700",   label: "Approved"       },
  rejected: { cls: "bg-red-100   text-red-700",     label: "Rejected"       },
  archived: { cls: "bg-slate-200 text-slate-500",   label: "Archived"       },
  // task / expense / service-call statuses (reused across modules)
  submitted:           { cls: "bg-yellow-100 text-yellow-700", label: "Submitted"      },
  pending_review:      { cls: "bg-yellow-100 text-yellow-700", label: "Pending Review" },
  in_progress:         { cls: "bg-blue-100   text-blue-700",   label: "In Progress"    },
  supervisor_approved: { cls: "bg-teal-100   text-teal-700",   label: "Supervisor ✓"  },
  finance_approved:    { cls: "bg-green-100  text-green-700",  label: "Finance ✓"      },
  reimbursed:          { cls: "bg-green-200  text-green-800",  label: "Reimbursed"     },
  new:                 { cls: "bg-sky-100    text-sky-700",    label: "New"            },
  assigned:            { cls: "bg-blue-100   text-blue-700",   label: "Assigned"       },
  resolved:            { cls: "bg-green-100  text-green-700",  label: "Resolved"       },
  closed:              { cls: "bg-slate-200  text-slate-500",  label: "Closed"         },
  escalated:           { cls: "bg-red-100    text-red-700",    label: "Escalated"      },
};

export default function StatusBadge({ status }) {
  const s = STYLE[status] || { cls: "bg-slate-100 text-slate-500", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
