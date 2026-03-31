import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "../common/EmptyState";
import { cn } from "../../utils/cn";

// A flexible table component that displays tabular dat with support for loading states, empty states, row click handling, and pagination.
export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = "No data available",
  onRowClick,
  pagination,
}) => {
  if (isLoading) {
    return (
      <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f172a] border-b border-[#1e2d45]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, idx) => (
              <tr key={idx} className="border-b border-[#1e2d45] last:border-0">
                {columns.map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-4">
                    <div className="h-4 bg-slate-700 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl">
        <EmptyState title={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#0f172a] border-b border-[#1e2d45]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "border-b border-[#1e2d45] last:border-0 transition-colors",
                  rowIdx % 2 === 1 && "bg-[#0f172a]/50",
                  onRowClick && "cursor-pointer hover:bg-indigo-900/10",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm text-slate-300">
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-[#1e2d45] flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#1e2d45] text-slate-300 hover:bg-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#1e2d45] text-slate-300 hover:bg-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
