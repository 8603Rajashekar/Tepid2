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

const ROLE_LABEL = {
  admin: "Admin", super_admin: "Admin", supervisor: "Supervisor",
  coordinator: "Coordinator", employee: "Employee", crm: "CRM",
  service_coordinator: "Coordinator", finance_officer: "Finance", finance: "Finance",
};

// Roles that this role can assign tasks to
const ASSIGNABLE_ROLES = {
  admin:               ["admin","super_admin","supervisor","coordinator","employee","crm","service_coordinator","finance_officer","finance"],
  super_admin:         ["admin","super_admin","supervisor","coordinator","employee","crm","service_coordinator","finance_officer","finance"],
  supervisor:          ["coordinator","employee","service_coordinator","crm"],
  coordinator:         ["employee"],
  service_coordinator: ["employee"],
};

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
function TaskRow({ task: t, myId, isAdmin, onApprove, onReject, compact, onAssign, assignees }) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignTo,   setAssignTo]   = useState("");

  const canApproveThis = isAdmin || t.created_by === myId;

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
        {onAssign && assignees && (t.status === "new" || (canApproveThis && t.status === "assigned")) && (
          showAssign ? (
            <div className="flex items-center gap-2">
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select person…</option>
                {assignees.map((u) => (
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
          <Btn color="yellow" onClick={() => onApprove(t.id, "submit")}>Submit for Review</Btn>
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
function CreateTaskForm({ assignees, myId, canAssign, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", assigned_to: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title:       form.title,
        description: form.description || undefined,
        priority:    "normal",
        due_date:    form.due_date,
        assigned_to: form.assigned_to || undefined,
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
        <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date <span className="text-red-500">*</span></label>
        <input required type="datetime-local"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={form.due_date} onChange={(e) => f("due_date", e.target.value)} />
      </div>

      {/* Assign to */}
      {canAssign && assignees.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Assign To</label>
          <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            value={form.assigned_to} onChange={(e) => f("assigned_to", e.target.value)}>
            <option value="">— Assign to someone (optional) —</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} · {ROLE_LABEL[u.role] || u.role}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit"
          className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
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
  const role   = localStorage.getItem("role") || "";
  const myUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myId   = myUser.id || "";

  const isAdmin    = ["admin", "super_admin"].includes(role);
  const canSeeAll  = isAdmin || role === "supervisor";
  const canAssign  = isAdmin || ["supervisor", "coordinator", "service_coordinator"].includes(role);
  const canCreate  = canAssign;

  const [tasks,       setTasks]       = useState([]);
  const [assignees,   setAssignees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [acting,      setActing]      = useState(null);
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
    setActing(endpoint);
    try {
      await (body ? api.post(endpoint, body) : api.post(endpoint));
      toast.success("Done");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setActing(null);
    }
  };

  const handleAction = (taskId, action) => {
    const endpoint = `/tasks/${taskId}/${action}`;
    act(endpoint);
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

      {/* ── CREATE FORM ── */}
      {showCreate && (
        <CreateTaskForm
          assignees={assignees}
          myId={myId}
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

      {/* ── SECTION TABS (admin + supervisor only) ── */}
      {canSeeAll && (
        <div className="flex gap-1 border-b border-slate-200">
          {[
            { key: "all",   label: "All Tasks" },
            { key: "board", label: `Team Board${reviewCount > 0 ? ` · ${reviewCount} to review` : ""}` },
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
      )}

      {/* ── TEAM BOARD TAB (admin + supervisor only) ── */}
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
              { key: "all",     label: canSeeAll ? `All (${tasks.length})` : `My Tasks (${tasks.length})` },
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
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
