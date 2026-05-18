import { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_COLOR = {
  uploaded: "bg-slate-100 text-slate-700",
  review:   "bg-blue-100 text-blue-700",
  signing:  "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-200 text-slate-500",
};

const WORKFLOW = [
  { label: "Uploaded",  key: "uploaded" },
  { label: "Review",    key: "review" },
  { label: "Signing",   key: "signing" },
  { label: "Approved",  key: "approved" },
  { label: "Rejected",  key: "rejected" },
  { label: "Archived",  key: "archived" },
];

function Badge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function DocumentsPage() {
  const [docs, setDocs]           = useState([]);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [rejectId, setRejectId]   = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm]           = useState({ name: "", file_url: "" });

  const fetchDocs = async () => {
    try {
      const res = await api.get("/documents/");
      setDocs(res.data);
    } catch {
      setError("Failed to load documents");
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const action = async (docId, endpoint, body = null) => {
    setLoading(true);
    setError(null);
    try {
      await (body ? api.post(endpoint, body) : api.post(endpoint));
      await fetchDocs();
    } catch (e) {
      setError(e.response?.data?.detail || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/documents/", form);
      setForm({ name: "", file_url: "" });
      setShowUpload(false);
      await fetchDocs();
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await action(`/documents/${rejectId}/reject`, `/documents/${rejectId}/reject`, { rejection_reason: rejectReason });
    setRejectId(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Documents</h1>
          <p className="text-xs text-slate-400 mt-0.5">Upload → Review → Sign → Approve → Archive</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Upload
        </button>
      </div>

      {/* Workflow steps */}
      <div className="flex gap-1 items-center overflow-x-auto pb-1">
        {WORKFLOW.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[s.key]}`}>{s.label}</span>
            {i < WORKFLOW.length - 1 && <span className="text-slate-300 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Upload Document</h2>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Document name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="File URL (e.g. https://storage.example.com/file.pdf)"
            value={form.file_url}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Upload
            </button>
            <button type="button" onClick={() => setShowUpload(false)} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-slate-800 mb-3">Rejection Reason</h2>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Explain why this document is rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReject} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition">
                Confirm Reject
              </button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {docs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No documents yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                      {d.name}
                    </a>
                  </td>
                  <td className="px-4 py-3"><Badge status={d.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {d.status === "uploaded" && (
                        <Btn color="blue" disabled={loading} onClick={() => action(`/documents/${d.id}/review`, `/documents/${d.id}/review`)}>
                          Send for Review
                        </Btn>
                      )}
                      {d.status === "review" && (<>
                        <Btn color="purple" disabled={loading} onClick={() => action(`/documents/${d.id}/signing`, `/documents/${d.id}/signing`)}>
                          Send for Signing
                        </Btn>
                        <Btn color="green" disabled={loading} onClick={() => action(`/documents/${d.id}/approve`, `/documents/${d.id}/approve`)}>
                          Approve
                        </Btn>
                        <Btn color="red" disabled={loading} onClick={() => setRejectId(d.id)}>
                          Reject
                        </Btn>
                      </>)}
                      {d.status === "signing" && (<>
                        <Btn color="green" disabled={loading} onClick={() => action(`/documents/${d.id}/approve`, `/documents/${d.id}/approve`)}>
                          Approve
                        </Btn>
                        <Btn color="red" disabled={loading} onClick={() => setRejectId(d.id)}>
                          Reject
                        </Btn>
                      </>)}
                      {d.status === "approved" && (
                        <Btn color="slate" disabled={loading} onClick={() => action(`/documents/${d.id}/archive`, `/documents/${d.id}/archive`)}>
                          Archive
                        </Btn>
                      )}
                      {d.rejection_reason && (
                        <span className="text-xs text-red-500 italic">{d.rejection_reason}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Btn({ color, children, disabled, onClick }) {
  const colors = {
    blue:   "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    green:  "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    red:    "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
    purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
    slate:  "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition disabled:opacity-50 ${colors[color]}`}
    >
      {children}
    </button>
  );
}
