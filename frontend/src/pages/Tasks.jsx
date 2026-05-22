import { useCallback, useEffect, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

// ── Constants ─────────────────────────────────────────────────────────────
const STATUS_META = {
  new:            { label: "New",           cls: "bg-slate-100 text-slate-600",   order: 0 },
  assigned:       { label: "Assigned",      cls: "bg-blue-100 text-blue-700",     order: 1 },
  in_progress:    { label: "In Progress",   cls: "bg-indigo-100 text-indigo-700", order: 2 },
  pending_review: { label: "Pending Review",cls: "bg-yellow-100 text-yellow-700", order: 3 },
  approved:       { label: "Approved",      cls: "bg-green-100 text-green-700",   order: 4 },
  rejected:       { label: "Rejected",      cls: "bg-red-100 text-red-700",       order: 5 },
};

function fmtTime(minutes) {
  if (minutes == null) return null;
  if (minutes < 60)   return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDateTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABEL = {
  admin: "Administrator",
  supervisor: "Team Supervisor",
  coordinator: "Call Coordinator",
  finance_officer: "Finance Officer",
  employee: "Field Employee",
  crm: "CRM Agent",
};

const TASK_TYPE_LABEL = {
  service: "Service",
  issue: "Issue",
  inspection: "Inspection",
  installation: "Installation",
  other: "Other",
};

// Roles that this role can assign tasks to
const ASSIGNABLE_ROLES = {
  admin:               ["admin","supervisor","coordinator","finance_officer","employee","crm"],
  super_admin:         ["admin","supervisor","coordinator","finance_officer","employee","crm"],
  supervisor:          ["coordinator","employee"],
  coordinator:         ["employee"],
  service_coordinator: ["employee"],
};

function getAssignableUsers(users, role) {
  const allowedRoles = ASSIGNABLE_ROLES[role] || [];
  return users.filter((user) => allowedRoles.includes(user.role));
}

// ── Small components ──────────────────────────────────────────────────────
function Badge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Btn({ color, children, onClick, disabled }) {
  const c = {
    blue:   "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
    slate:  "bg-slate-50  text-slate-600  border-slate-200  hover:bg-slate-100",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-50 ${c[color]}`}>
      {disabled ? "…" : children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-32 bg-slate-200 rounded" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />)}
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-white border-slate-200 text-slate-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ── Assignee Team Board ───────────────────────────────────────────────────
function TeamBoard({ tasks, myId, isAdmin, onApprove, onReject }) {
  const [expanded, setExpanded] = useState({});

  // Group tasks by assignee
  const groups = {};
  for (const t of tasks) {
    if (!t.assigned_to) continue;
    const key = t.assigned_to;
    if (!groups[key]) groups[key] = { name: t.assigned_to_name || "Unknown", tasks: [] };
    groups[key].tasks.push(t);
  }

  // Also add unassigned group
  const unassigned = tasks.filter((t) => !t.assigned_to);

  const statusOrder = (s) => STATUS_META[s]?.order ?? 99;

  return (
    <div className="space-y-3">
      {Object.entries(groups)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name))
        .map(([userId, group]) => {
          const total     = group.tasks.length;
          const completed = group.tasks.filter((t) => t.status === "approved").length;
          const inProg    = group.tasks.filter((t) => t.status === "in_progress").length;
          const pending   = group.tasks.filter((t) => t.status === "pending_review").length;
          const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isOpen    = expanded[userId];

          return (
            <div key={userId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Assignee header row */}
              <button
                onClick={() => setExpanded((e) => ({ ...e, [userId]: !e[userId] }))}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition text-left"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                  {(group.name || "?").charAt(0).toUpperCase()}
                </div>

                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-800 text-sm truncate">{group.name}</p>
                    {pending > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full font-semibold">
                        {pending} awaiting review
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{pct}%</span>
                  </div>
                </div>

                {/* Stat chips */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{total} tasks</span>
                  {inProg > 0  && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{inProg} active</span>}
                  {completed > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{completed} done</span>}
                  <span className={`text-xs transition ${isOpen ? "rotate-90" : ""}`}>▶</span>
                </div>
              </button>

              {/* Expanded task list */}
              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {[...group.tasks]
                    .sort((a, b) => statusOrder(a.status) - statusOrder(b.status))
                    .map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        myId={myId}
                        isAdmin={isAdmin}
                        onApprove={onApprove}
                        onReject={onReject}
                        compact
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}

      {/* Unassigned tasks */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Unassigned ({unassigned.length})
          </p>
          <div className="space-y-2">
            {unassigned.map((t) => (
              <TaskRow key={t.id} task={t} myId={myId} isAdmin={isAdmin}
                onApprove={onApprove} onReject={onReject} compact />
            ))}
          </div>
        </div>
      )}

      {Object.keys(groups).length === 0 && unassigned.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">No tasks yet</div>
      )}
    </div>
  );
}

// ── Live elapsed timer for in-progress tasks ─────────────────────────────
function LiveTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const base = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 60000));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
      ⏱ {fmtTime(elapsed)} so far
    </span>
  );
}

// ── Single task row (used in both list and team board) ────────────────────
function TaskRow({ task: t, myId, isAdmin, onApprove, onReject, compact, onAssign, assignees, role }) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignTo,   setAssignTo]   = useState("");

  const canApproveThis = isAdmin || t.created_by === myId;
  const allowedUsers = getAssignableUsers(assignees || [], role);

  const handleAssign = () => {
    if (!assignTo) return;
    onAssign(t.id, assignTo);
    setShowAssign(false);
    setAssignTo("");
  };

  return (
    <div className={`${compact ? "px-5 py-3" : "bg-white rounded-xl border border-slate-200 p-4"} hover:bg-slate-50 transition`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
            <Badge status={t.status} />
            <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-semibold">
              {TASK_TYPE_LABEL[t.task_type] || t.task_type || "Other"}
            </span>
            {/* Live timer while in progress */}
            {t.status === "in_progress" && t.started_at && (
              <LiveTimer startedAt={t.started_at} />
            )}
            {/* Time spent once submitted/approved */}
            {t.time_spent_minutes != null && t.status !== "in_progress" && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">
                ⏱ {fmtTime(t.time_spent_minutes)}
              </span>
            )}
          </div>
          {t.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{t.description}</p>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-2 flex-wrap">
        {t.due_date && (
          <span className={new Date(t.due_date) < new Date() && !["approved"].includes(t.status) ? "text-red-500 font-medium" : ""}>
            Due: {new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        {t.assigned_to_name && !compact && (
          <span className="flex items-center gap-1">
            👤 <span className="font-medium text-slate-600">{t.assigned_to_name}</span>
          </span>
        )}
        {t.created_by_name && (
          <span>Assigned by: <span className="font-medium text-slate-600">{t.created_by_name}</span></span>
        )}
        {t.assigned_at && (
          <span>Assigned at: <span className="font-medium text-slate-600">{fmtDateTime(t.assigned_at)}</span></span>
        )}
        {t.completed_at && (
          <span>Submitted at: <span className="font-medium text-slate-600">{fmtDateTime(t.completed_at)}</span></span>
        )}
        {t.time_spent_minutes != null && (
          <span className="text-green-600 font-medium">⏱ {fmtTime(t.time_spent_minutes)}</span>
        )}
      </div>

      {/* Rejection reason */}
      {t.rejection_reason && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs text-red-700 mb-2">
          <span className="font-semibold">Rejected:</span> {t.rejection_reason}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* Assign / Reassign */}
        {onAssign && allowedUsers.length > 0 && (t.status === "new" || (canApproveThis && t.status === "assigned")) && (
          showAssign ? (
            <div className="flex items-center gap-2">
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select person…</option>
                {allowedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({ROLE_LABEL[u.role] || u.role})
                  </option>
                ))}
              </select>
              <Btn color="blue" onClick={handleAssign} disabled={!assignTo}>Assign</Btn>
              <Btn color="slate" onClick={() => setShowAssign(false)}>Cancel</Btn>
            </div>
          ) : (
            <Btn color="blue" onClick={() => setShowAssign(true)}>
              {t.status === "new" ? "Assign" : "Reassign"}
            </Btn>
          )
        )}

        {/* Employee actions */}
        {t.status === "assigned" && t.assigned_to === myId && (
          <Btn color="indigo" onClick={() => onApprove(t.id, "start")}>Start</Btn>
        )}
        {t.status === "in_progress" && t.assigned_to === myId && (
          <Btn color="yellow" onClick={() => onApprove(t.id, "submit")}>Submit Assigned Work</Btn>
        )}

        {/* Approve/Reject — only creator or admin */}
        {t.status === "pending_review" && canApproveThis && (<>
          <Btn color="green" onClick={() => onApprove(t.id, "approve")}>✓ Approve</Btn>
          <Btn color="red"   onClick={() => onReject(t.id)}>✕ Reject</Btn>
        </>)}
      </div>
    </div>
  );
}

// ── Create task form ──────────────────────────────────────────────────────
function CreateTaskForm({ assignees, role, canAssign, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", assigned_to: "", task_type: "other",
  });
  const allowedUsers = getAssignableUsers(assignees, role);
  const canSubmit = canAssign && allowedUsers.length > 0 && Boolean(form.assigned_to);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Select a valid assignee before creating the task");
      return;
    }
    try {
      const payload = {
        title:       form.title,
        description: form.description || undefined,
        priority:    "normal",
        task_type:   form.task_type,
        due_date:    form.due_date || undefined,
        assigned_to: form.assigned_to,
      };
      await api.post("/tasks/", payload);
      toast.success("Task created");
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Create failed");
    }
  };

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h2 className="font-semibold text-slate-800">Create Task</h2>

      <input required placeholder="Title (min 5 chars)" minLength={5}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={form.title} onChange={(e) => f("title", e.target.value)} />

      <textarea placeholder="Description (optional)" rows={2}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={form.description} onChange={(e) => f("description", e.target.value)} />

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Task Type</label>
        <select
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          value={form.task_type}
          onChange={(e) => f("task_type", e.target.value)}
        >
          {Object.entries(TASK_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
        <input type="datetime-local"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.due_date} onChange={(e) => f("due_date", e.target.value)} />
      </div>

      {/* Assign to */}
      {canAssign && allowedUsers.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Assign To</label>
          <select required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            value={form.assigned_to} onChange={(e) => f("assigned_to", e.target.value)}>
            <option value="">Select assignee</option>
            {allowedUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} · {ROLE_LABEL[u.role] || u.role}
              </option>
            ))}
          </select>
        </div>
      )}

      {canAssign && allowedUsers.length === 0 && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          No valid assignees are available for your role.
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={!canSubmit}
          className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed">
          Create Task
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Tasks() {
  const toast = useToast();
  const myUser = JSON.parse(localStorage.getItem("user") || "{}");
  const role   = localStorage.getItem("role") || myUser.role || myUser.roles?.[0] || "";
  const myId   = myUser.id || "";

  const isAdmin    = ["admin", "super_admin"].includes(role);
  const canSeeAll  = isAdmin;
  const canAssign  = isAdmin || ["supervisor", "coordinator", "service_coordinator"].includes(role);
  const canCreate  = canAssign;

  const [tasks,       setTasks]       = useState([]);
  const [assignees,   setAssignees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("all");
  const [filter,      setFilter]      = useState("all");
  const [showCreate,  setShowCreate]  = useState(false);
  const [rejectId,    setRejectId]    = useState(null);
  const [rejectReason,setRejectReason]= useState("");

  const load = useCallback(async () => {
    try {
      const [tasksRes, assigneesRes] = await Promise.all([
        api.get("/tasks/"),
        canAssign ? api.get("/tasks/assignees") : Promise.resolve({ data: [] }),
      ]);
      setTasks(tasksRes.data);
      setAssignees(assigneesRes.data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [canAssign]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const act = async (endpoint, body = null) => {
    try {
      await (body ? api.post(endpoint, body) : api.post(endpoint));
      toast.success("Done");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const handleAction = (taskId, action) => {
    const endpoint = `/tasks/${taskId}/${action}`;
    return act(endpoint);
  };

  const handleAssign = (taskId, userId) => {
    act(`/tasks/${taskId}/assign`, { assigned_to: userId });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await act(`/tasks/${rejectId}/reject`, { rejection_reason: rejectReason });
    setRejectId(null);
    setRejectReason("");
  };

  // Filter visible tasks for "All Tasks" tab
  const filtered = tasks.filter((t) => {
    if (filter === "all")      return true;
    if (filter === "mine")     return t.assigned_to === myId;
    if (filter === "created")  return t.created_by === myId;
    if (filter === "review")   return t.status === "pending_review";
    return t.status === filter;
  });

  // Count pending-review tasks that this user can act on
  const reviewCount = tasks.filter((t) => t.status === "pending_review" && (isAdmin || t.created_by === myId)).length;
  const pendingCount = tasks.filter((t) => !["approved"].includes(t.status)).length;
  const completedCount = tasks.filter((t) => t.status === "approved").length;
  const overdueCount = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "approved").length;
  const tasksByRole = tasks.reduce((acc, task) => {
    const roleKey = task.assigned_to_role || "unassigned";
    acc[roleKey] = (acc[roleKey] || 0) + 1;
    return acc;
  }, {});
  const roleSummary = Object.entries(tasksByRole)
    .sort(([, a], [, b]) => b - a)
    .map(([roleName, count]) => `${ROLE_LABEL[roleName] || roleName}: ${count}`)
    .join(" / ") || "None";

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {tasks.length} total · {tasks.filter(t => t.status === "in_progress").length} in progress
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            + New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Pending Tasks" value={pendingCount} tone="yellow" />
        <MetricCard label="Completed Tasks" value={completedCount} tone="green" />
        <MetricCard label="Overdue Tasks" value={overdueCount} tone={overdueCount > 0 ? "red" : "slate"} />
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tasks by Role</p>
          <p className="text-sm font-semibold text-slate-700 mt-2 leading-5">{roleSummary}</p>
        </div>
      </div>

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <CreateTaskForm
          assignees={assignees}
          role={role}
          canAssign={canAssign}
          onSave={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── REJECT MODAL ── */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-slate-800 mb-1">Reason for Rejection</h2>
            <p className="text-xs text-slate-400 mb-3">The assignee will be notified and the task will be reopened for rework.</p>
            <textarea rows={3} placeholder="Explain why this task is being rejected…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReject}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium">
                Reject Task
              </button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "all",   label: "All Tasks" },
          ...(canSeeAll ? [{ key: "board", label: `Team Board${reviewCount > 0 ? ` · ${reviewCount} to review` : ""}` }] : []),
        ].map((s) => (
          <button key={s.key} onClick={() => setTab(s.key)}
            className={`text-sm px-5 py-2.5 font-semibold border-b-2 transition ${
              tab === s.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── TEAM BOARD TAB (admin only) ── */}
      {tab === "board" && canSeeAll && (
        <TeamBoard
          tasks={tasks}
          myId={myId}
          isAdmin={isAdmin}
          onApprove={handleAction}
          onReject={setRejectId}
        />
      )}

      {/* ── ALL TASKS TAB ── */}
      {tab === "all" && (
        <>
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all",     label: canSeeAll ? `All (${tasks.length})` : `Visible Tasks (${tasks.length})` },
              ...(canSeeAll ? [{ key: "mine",    label: "Assigned to me" }] : []),
              ...(canSeeAll ? [{ key: "pending_review", label: `Needs Review${reviewCount > 0 ? ` (${reviewCount})` : ""}` }] : []),
              { key: "in_progress",    label: "In Progress" },
              { key: "approved",       label: "Approved"    },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                  filter === f.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-slate-400 text-sm">No tasks match this filter</p>
              </div>
            ) : (
              filtered.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  myId={myId}
                  isAdmin={isAdmin}
                  onApprove={handleAction}
                  onReject={setRejectId}
                  onAssign={canAssign ? handleAssign : null}
                  assignees={assignees}
                  role={role}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
