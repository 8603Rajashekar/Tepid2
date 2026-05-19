export default function Table({ columns, rows, emptyText = "No data" }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-slate-50 transition">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
