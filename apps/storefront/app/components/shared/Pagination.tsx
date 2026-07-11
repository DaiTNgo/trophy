import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from(
    new Set(
      [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
        (page) => page >= 1 && page <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 md:mt-12">
      <button
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-border-subtle bg-surface-base text-on-surface-variant transition-colors hover:border-brand-support hover:text-brand-support disabled:opacity-45 disabled:hover:border-border-subtle disabled:hover:text-on-surface-variant"
      >
        <ChevronLeft />
      </button>

      {pages.map((page, index) => {
        const showGap = index > 0 && pages[index] - pages[index - 1] > 1;
        return (
          <div key={page} className="flex items-center gap-2">
            {showGap ? (
              <span className="px-1 text-on-surface-variant">...</span>
            ) : null}
            <button
              onClick={() => onPageChange?.(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`flex h-10 min-w-10 items-center justify-center rounded-sm border px-3 font-label-md text-[12px] uppercase tracking-[0.12em] transition-colors ${
                page === currentPage
                  ? "border-brand-strong bg-brand-strong text-white"
                  : "border-border-subtle bg-surface-base text-on-surface-variant hover:border-brand-support hover:text-brand-support"
              }`}
            >
              {page}
            </button>
          </div>
        );
      })}

      <button
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-border-subtle bg-surface-base text-on-surface-variant transition-colors hover:border-brand-support hover:text-brand-support disabled:opacity-45 disabled:hover:border-border-subtle disabled:hover:text-on-surface-variant"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
