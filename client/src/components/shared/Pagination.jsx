import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../common/Button";

const buildPageItems = (currentPage, totalPages) => {
  if (totalPages <= 1) {
    return [1];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages]);

  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(totalPages - 1, currentPage + 1);
    page += 1
  ) {
    pages.add(page);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const page = sortedPages[index];
    const previous = sortedPages[index - 1];

    if (index > 0 && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`);
    }

    items.push(page);
  }

  return items;
};

export const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  itemLabel = "items",
}) => {
  const safeItemsPerPage = Math.max(Number(itemsPerPage) || 1, 1);
  const normalizedTotalItems = Math.max(Number(totalItems) || 0, 0);
  const totalPages = Math.max(
    Math.ceil(normalizedTotalItems / safeItemsPerPage),
    1,
  );
  const safeCurrentPage = Math.min(
    Math.max(Number(currentPage) || 1, 1),
    totalPages,
  );

  const start =
    normalizedTotalItems > 0 ? (safeCurrentPage - 1) * safeItemsPerPage + 1 : 0;
  const end =
    normalizedTotalItems > 0
      ? Math.min(safeCurrentPage * safeItemsPerPage, normalizedTotalItems)
      : 0;

  const pageItems = useMemo(
    () => buildPageItems(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages],
  );

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage !== safeCurrentPage) {
      onPageChange(nextPage);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#1e2d45] bg-[#0f172a] px-4 py-3 text-sm text-slate-300 shadow-[0_12px_40px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
      <p className="transition-all duration-200 ease-out">
        Showing {start}–{end} of {normalizedTotalItems.toLocaleString()}{" "}
        {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => goToPage(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="min-w-24"
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        {pageItems.map((pageItem) =>
          typeof pageItem === "number" ? (
            <Button
              key={pageItem}
              type="button"
              variant={pageItem === safeCurrentPage ? "primary" : "ghost"}
              onClick={() => goToPage(pageItem)}
              className={`min-w-10 px-3 transition-all duration-200 ease-out ${
                pageItem === safeCurrentPage
                  ? "shadow-lg shadow-blue-600/20 scale-105"
                  : ""
              }`}
            >
              {pageItem}
            </Button>
          ) : (
            <span key={pageItem} className="px-1 text-slate-500 select-none">
              ...
            </span>
          ),
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={() => goToPage(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="min-w-24"
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};
