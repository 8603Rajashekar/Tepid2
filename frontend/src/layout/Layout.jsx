import Sidebar from "./Sidebar";

export default function Layout({ role, onLogout, children }) {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar role={role} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
