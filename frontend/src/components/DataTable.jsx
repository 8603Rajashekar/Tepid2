/**
 * DataTable — simple table for quick use cases.
 * columns: string[]          — header labels
 * data:    object[]          — each object's values become cells (order = object key order)
 * onRowClick: (row) => void  — optional row click handler
 * emptyText: string          — shown when data is empty
 *
 * For tables with custom cell rendering, use Table.jsx instead.
 */
export default function DataTable({
  columns,
  data,
  onRowClick,
  emptyText = "No data available",
  loading = false,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
        <div className="h-10 bg-slate-100 border-b border-slate-200" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 bg-white" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <p className="text-slate-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick
                    ? "hover:bg-slate-50 cursor-pointer"
                    : "hover:bg-slate-50"
                }`}
              >
                {Object.values(row).map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-slate-700">
                    {cell ?? <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-right">
        <span className="text-xs text-slate-400">
          {data.length} row{data.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
