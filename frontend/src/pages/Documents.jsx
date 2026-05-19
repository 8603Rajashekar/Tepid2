import { useEffect, useState } from "react";
import api from "../api/api";

const STATUS_COLOR = {
  uploaded: "bg-slate-100 text-slate-600",
  review:   "bg-blue-100 text-blue-700",
  signing:  "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-200 text-slate-400",
};

export default function Documents() {
  const role     = localStorage.getItem("role") || "";
  const canApprove = ["super_admin", "admin", "supervisor"].includes(role);

  const [docs,       setDocs]       = useState([]);
  const [error,      setError]      = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectId,   setRejectId]   = useState(null);
  const [reason,     setReason]     = useState("");
  const [form,       setForm]       = useState({ name: "", file_url: "" });

  const fetchDocs = async () => {
    try {
      const res = await api.get("/documents/");
      setDocs(res.data);
      setError(null);
    } catch {
      setError("Failed to load documents");
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const act = async (endpoint) => {
    try { await api.post(endpoint); fetchDocs(); }
    catch (e) { setError(e.response?.data?.detail || "Action failed"); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/documents/", form);
      setForm({ name: "", file_url: "" });
      setShowCreate(false);
      fetchDocs();
    } catch (e) { setError(e.response?.data?.detail || "Upload failed"); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    try {
      await api.post(`/documents/${rejectId}/reject`, { rejection_reason: reason });
      setRejectId(null); setReason(""); fetchDocs();
    } catch (e) { setError(e.response?.data?.detail || "Reject failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Documents</h1>
          <p className="text-xs text-slate-400 mt-0.5">Upload → Review → Signing → Approved → Archived</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Upload
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>}

      {/* Upload form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700">Upload Document</h2>
          <input required placeholder="Document name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required placeholder="File URL (https://...)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">Upload</button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-slate-800 mb-3">Rejection Reason</h2>
            <textarea rows={3} placeholder="Why is this document rejected?"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReject} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition">Reject</button>
              <button onClick={() => { setRejectId(null); setReason(""); }} className="text-sm text-slate-500 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {docs.length === 0
          ? <p className="text-slate-400 text-sm text-center py-12">No documents yet</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Name", "Status", "Uploaded", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">{d.name}</a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status] || "bg-slate-100 text-slate-500"}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {d.status === "uploaded" && <Btn color="blue" onClick={() => act(`/documents/${d.id}/review`)}>Send for Review</Btn>}
                        {d.status === "review" && canApprove && (<>
                          <Btn color="purple" onClick={() => act(`/documents/${d.id}/signing`)}>Send for Signing</Btn>
                          <Btn color="green"  onClick={() => act(`/documents/${d.id}/approve`)}>Approve</Btn>
                          <Btn color="red"    onClick={() => setRejectId(d.id)}>Reject</Btn>
                        </>)}
                        {d.status === "signing" && canApprove && (<>
                          <Btn color="green" onClick={() => act(`/documents/${d.id}/approve`)}>Approve</Btn>
                          <Btn color="red"   onClick={() => setRejectId(d.id)}>Reject</Btn>
                        </>)}
                        {d.status === "approved" && canApprove && <Btn color="slate" onClick={() => act(`/documents/${d.id}/archive`)}>Archive</Btn>}
                        {d.rejection_reason && <span className="text-xs text-red-500 italic">{d.rejection_reason}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

function Btn({ color, children, onClick }) {
  const c = {
    blue:   "bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    green:  "bg-green-50  text-green-700  border-green-200  hover:bg-green-100",
    red:    "bg-red-50    text-red-700    border-red-200    hover:bg-red-100",
    slate:  "bg-slate-100 text-slate-600  border-slate-200  hover:bg-slate-200",
  };
  return (
    <button onClick={onClick} className={`text-xs px-2.5 py-1 rounded-md border font-medium transition ${c[color]}`}>{children}</button>
  );
}
