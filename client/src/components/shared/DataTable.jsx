import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState } from "../common/EmptyState";
import { Pagination } from "./Pagination";
import { cn } from "../../utils/cn";

// A flexible table component that displays tabular dat with support for loading states, empty states, row click handling, and pagination.
export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = "No data available",
  onRowClick,
  pagination,
  sortState,
  onSortChange,
  cellClassName = "px-4 py-3 text-sm text-slate-300",
}) => {
  const [internalSort, setInternalSort] = useState(null);
  const activeSort = sortState !== undefined ? sortState : internalSort;

  const getSortKey = (col) => col.sortKey || col.key;

  const getComparableValue = (value) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "string") {
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && value.trim() !== "") return numeric;
      return value.toLowerCase();
    }
    return "";
  };

  const isColumnSortable = (col) => {
    if (typeof col.sortable === "boolean") return col.sortable;
    if (typeof col.sortAccessor === "function") return true;
    if (col.key === "actions") return false;

    const sampleRow = data.find(
      (row) => row?.[col.key] !== null && row?.[col.key] !== undefined,
    );
    const sampleValue = sampleRow?.[col.key];
    const sampleType = typeof sampleValue;

    return (
      sampleValue instanceof Date ||
      sampleType === "string" ||
      sampleType === "number" ||
      sampleType === "boolean"
    );
  };

  const columnsWithMeta = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        sortKey: getSortKey(col),
        isSortable: isColumnSortable(col),
      })),
    [columns, data],
  );

  const sortedData = useMemo(() => {
    if (!activeSort?.key || !activeSort?.direction) return data;

    const column = columnsWithMeta.find(
      (col) => col.sortKey === activeSort.key,
    );
    if (!column?.isSortable) return data;

    return [...data].sort((a, b) => {
      const aValue = getComparableValue(
        column.sortAccessor ? column.sortAccessor(a) : a?.[column.key],
      );
      const bValue = getComparableValue(
        column.sortAccessor ? column.sortAccessor(b) : b?.[column.key],
      );

      let result = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return activeSort.direction === "asc" ? result : -result;
    });
  }, [data, activeSort, columnsWithMeta]);

  const handleSort = (col) => {
    if (!col.isSortable) return;

    let nextSort = null;
    if (activeSort?.key !== col.sortKey) {
      nextSort = { key: col.sortKey, direction: "asc" };
    } else if (activeSort.direction === "asc") {
      nextSort = { key: col.sortKey, direction: "desc" };
    }

    onSortChange?.(nextSort);
    if (sortState === undefined) {
      setInternalSort(nextSort);
    }
  };

  const renderSortIcon = (col) => {
    if (!col.isSortable) return null;

    if (activeSort?.key !== col.sortKey || !activeSort?.direction) {
      return <ArrowUpDown size={14} className="text-slate-500" />;
    }

    return activeSort.direction === "asc" ? (
      <ArrowUp size={14} className="text-indigo-400" />
    ) : (
      <ArrowDown size={14} className="text-indigo-400" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0f172a] border-b border-[#1e2d45]">
            <tr>
              {columnsWithMeta.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.isSortable ? (
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {renderSortIcon(col)}
                    </div>
                  ) : (
                    col.header
                  )}
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
              {columnsWithMeta.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.isSortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                    >
                      <span>{col.header}</span>
                      {renderSortIcon(col)}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "border-b border-[#1e2d45] last:border-0 transition-colors",
                  rowIdx % 2 === 1 && "bg-[#0f172a]/50",
                  onRowClick && "cursor-pointer hover:bg-indigo-900/10",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columnsWithMeta.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(cellClassName, col.cellClassName)}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          totalItems={pagination.totalItems ?? pagination.total ?? 0}
          itemsPerPage={pagination.itemsPerPage ?? pagination.limit ?? 1}
          currentPage={pagination.currentPage ?? pagination.page ?? 1}
          onPageChange={pagination.onPageChange}
          itemLabel={pagination.itemLabel || "items"}
        />
      )}
    </div>
  );
};
