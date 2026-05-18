import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  new:            "#94a3b8",
  assigned:       "#f59e0b",
  in_progress:    "#3b82f6",
  pending_review: "#8b5cf6",
  approved:       "#22c55e",
  rejected:       "#ef4444",
};

export function TaskPieChart({ tasks }) {
  const data = Object.entries(tasks || {})
    .filter(([k, v]) => k !== "total" && v > 0)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value, key: name }));

  if (!data.length) {
    return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>;
  }

  return (
    <PieChart width={300} height={220}>
      <Pie data={data} cx={150} cy={100} outerRadius={85} dataKey="value" label={({ name, value }) => `${value}`} labelLine={false} fontSize={11}>
        {data.map((entry, i) => (
          <Cell key={i} fill={STATUS_COLORS[entry.key] || "#94a3b8"} />
        ))}
      </Pie>
      <Tooltip formatter={(v, n) => [v, n]} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  );
}

export function AgentBarChart({ agents = [] }) {
  const data = agents.slice(0, 8).map((a) => ({
    name: a.name || a.agent_id.slice(0, 8),
    total: a.total_tasks,
    approved: a.approved,
    score: a.avg_efficiency ?? 0,
  }));

  if (!data.length) {
    return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No agent data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
        <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
