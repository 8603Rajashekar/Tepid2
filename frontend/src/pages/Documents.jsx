import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";

// Static folders — IDs are stable pseudo-UUIDs stored in folder_id column
const FOLDERS = [
  { id: null,                                    name: "All Files",  icon: "📂" },
  { id: "00000000-0000-0000-0000-000000000001",  name: "HR",         icon: "👥" },
  { id: "00000000-0000-0000-0000-000000000002",  name: "Finance",    icon: "💰" },
  { id: "00000000-0000-0000-0000-000000000003",  name: "Projects",   icon: "📋" },
  { id: "00000000-0000-0000-0000-000000000004",  name: "Contracts",  icon: "📝" },
];

const STATUS_FILTERS = [
  "all", "uploaded", "review", "signing", "approved", "rejected", "archived",
];

function fileIcon(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf")                        return "📄";
  if (["doc", "docx"].includes(ext))        return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️";
  if (["zip","rar"].includes(ext))          return "📦";
  return "📎";
}

function folderName(folderId) {
  if (!folderId) return null;
  return FOLDERS.find((f) => f.id === String(folderId) || f.id === folderId)?.name ?? null;
}

function Btn({ color, children, onClick, disabled }) {
  const c = {
    blue:   "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
    slate:  "bg-slate-100 text-slate-600  border-slate-200  hover:bg-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition whitespace-nowrap disabled:opacity-50 ${c[color]}`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="flex gap-5 animate-pulse">
      <div className="w-52 flex-shrink-0 space-y-3">
        <div className="h-64 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-48 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-10 bg-slate-100 rounded-xl border border-slate-200" />
        <div className="h-72 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
    </div>
  );
}

export default function Documents() {
  const toast      = useToast();
  const role       = localStorage.getItem("role") || "";
  const canApprove = ["admin", "super_admin", "supervisor"].includes(role);
  const isAdmin    = ["admin", "super_admin"].includes(role);
  const fileRef    = useRef(null);

  const [docs,         setDocs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [showUpload,   setShowUpload]   = useState(false);
  const [rejectId,     setRejectId]     = useState(null);
  const [reason,       setReason]       = useState("");
  const [acting,       setActing]       = useState(null);
  const [form,         setForm]         = useState({ name: "", folder_id: "" });
  const [selectedFile, setSelectedFile] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/documents/");
      setDocs(res.data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Per-folder document counts
  const folderCounts = Object.fromEntries(
    FOLDERS.slice(1).map((f) => [
      f.id,
      docs.filter((d) => String(d.folder_id) === f.id).length,
    ])
  );

  // Filtered view
  const visible = docs.filter((d) => {
    if (activeFolder && String(d.folder_id) !== activeFolder) return false;
    if (statusFilter !== "all" && d.status !== statusFilter)  return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Perform a simple POST action (no body)
  const act = async (endpoint, successMsg) => {
    setActing(endpoint);
    try {
      await api.post(endpoint);
      toast.success(successMsg);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    } finally { setActing(null); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Please select a file"); return; }
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      if (form.folder_id) fd.append("folder_id", form.folder_id);
      await api.post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      setForm({ name: "", folder_id: "" });
      setSelectedFile(null);
      setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setActing(rejectId);
    try {
      await api.post(`/documents/${rejectId}/reject`, { rejection_reason: reason });
      toast.success("Document rejected");
      setRejectId(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Reject failed");
    } finally { setActing(null); }
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setSelectedFile(f);
    setForm((prev) => ({ ...prev, name: prev.name || f.name, file_url: "" }));
  };

  if (loading) return <Skeleton />;

  return (
    <div className="flex gap-5 min-h-0">

      {/* ── LEFT: FOLDER PANEL ── */}
      <aside className="w-52 flex-shrink-0 space-y-3">

        {/* Folders */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Folders</p>
          </div>
          <ul className="py-1">
            {FOLDERS.map((f) => (
              <li key={String(f.id)}>
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    activeFolder === f.id
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </span>
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium ${
                    activeFolder === f.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {f.id === null ? docs.length : (folderCounts[f.id] ?? 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Status filter */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
          </div>
          <ul className="py-1">
            {STATUS_FILTERS.map((s) => (
              <li key={s}>
                <button
                  onClick={() => setStatusFilter(s)}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors capitalize ${
                    statusFilter === s
                      ? "text-blue-700 font-semibold bg-blue-50"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "All Statuses" : s === "signing" ? "E-Sign Pending" : s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── RIGHT: MAIN PANEL ── */}
      <main className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Documents</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload → Review → E-Sign → Approved → Archived
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition font-medium flex-shrink-0"
          >
            + Upload Document
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Document table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {visible.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-slate-600 font-medium text-sm">No documents found</p>
              <p className="text-slate-400 text-xs mt-1">
                {search ? "Try a different search term" : activeFolder ? "No files in this folder yet" : "Upload your first document above"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Document", "Status", "Ver", "Uploaded", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((d) => {
                    const folder = folderName(d.folder_id);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">

                        {/* Name + folder */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-lg flex-shrink-0">{fileIcon(d.name)}</span>
                            <div className="min-w-0">
                              <a
                                href={d.file_url?.startsWith("/uploads")
                                  ? `${process.env.REACT_APP_API_URL}${d.file_url}`
                                  : d.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-blue-600 hover:underline block truncate max-w-[200px]"
                              >
                                {d.name}
                              </a>
                              {folder && (
                                <p className="text-xs text-slate-400 mt-0.5">{folder}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status + rejection reason */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={d.status} />
                          {d.rejection_reason && (
                            <p
                              className="text-xs text-red-400 mt-1 max-w-[140px] truncate"
                              title={d.rejection_reason}
                            >
                              {d.rejection_reason}
                            </p>
                          )}
                        </td>

                        {/* Version */}
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded">
                            v{d.version ?? 1}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(d.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {d.status === "uploaded" && (
                              <Btn
                                color="blue"
                                disabled={acting === `/documents/${d.id}/review`}
                                onClick={() => act(`/documents/${d.id}/review`, "Sent for review")}
                              >
                                {acting === `/documents/${d.id}/review` ? "…" : "Send for Review"}
                              </Btn>
                            )}

                            {d.status === "review" && canApprove && (<>
                              <Btn
                                color="purple"
                                disabled={acting === `/documents/${d.id}/signing`}
                                onClick={() => act(`/documents/${d.id}/signing`, "Sent for e-sign")}
                              >
                                {acting === `/documents/${d.id}/signing` ? "…" : "Send for E-Sign"}
                              </Btn>
                              <Btn
                                color="green"
                                disabled={acting === `/documents/${d.id}/approve`}
                                onClick={() => act(`/documents/${d.id}/approve`, "Document approved")}
                              >
                                {acting === `/documents/${d.id}/approve` ? "…" : "✓ Approve"}
                              </Btn>
                              <Btn color="red" onClick={() => setRejectId(d.id)}>✕ Reject</Btn>
                            </>)}

                            {d.status === "signing" && canApprove && (<>
                              <Btn
                                color="green"
                                disabled={acting === `/documents/${d.id}/approve`}
                                onClick={() => act(`/documents/${d.id}/approve`, "Document approved")}
                              >
                                {acting === `/documents/${d.id}/approve` ? "…" : "✓ Approve Signed"}
                              </Btn>
                              <Btn color="red" onClick={() => setRejectId(d.id)}>✕ Reject</Btn>
                            </>)}

                            {d.status === "approved" && isAdmin && (
                              <Btn
                                color="slate"
                                disabled={acting === `/documents/${d.id}/archive`}
                                onClick={() => act(`/documents/${d.id}/archive`, "Document archived")}
                              >
                                {acting === `/documents/${d.id}/archive` ? "…" : "Archive"}
                              </Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row count */}
        {visible.length > 0 && (
          <p className="text-xs text-slate-400 text-right">
            {visible.length} document{visible.length !== 1 ? "s" : ""}
            {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
            {search ? ` · "${search}"` : ""}
          </p>
        )}
      </main>

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-slate-800 text-lg mb-4">Upload Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">

              {/* File picker */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">File *</label>
                <input
                  ref={fileRef}
                  type="file"
                  required
                  onChange={onFileChange}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Folder</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  value={form.folder_id}
                  onChange={(e) => setForm({ ...form, folder_id: e.target.value })}
                >
                  <option value="">— No folder —</option>
                  {FOLDERS.slice(1).map((f) => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 rounded-xl font-semibold transition"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpload(false);
                    setForm({ name: "", folder_id: "" });
                    setSelectedFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="flex-1 border border-slate-300 text-slate-600 text-sm py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-slate-800 mb-1">Reject Document</h2>
            <p className="text-xs text-slate-400 mb-3">
              Give a reason so the uploader knows what to fix.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Incorrect format, missing signature…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                disabled={!reason.trim() || !!acting}
                className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 font-semibold transition"
              >
                {acting ? "Rejecting…" : "Reject"}
              </button>
              <button
                onClick={() => { setRejectId(null); setReason(""); }}
                className="flex-1 border border-slate-300 text-slate-600 text-sm py-2.5 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
