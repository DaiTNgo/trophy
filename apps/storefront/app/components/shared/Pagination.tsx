import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="mt-20 flex justify-center items-center gap-4">
      <button 
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={currentPage <= 1}
        className="w-12 h-12 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
      >
        <ChevronLeft />
      </button>
      <span className="font-label-md text-label-md text-on-surface-variant px-4">
        Trang {currentPage} / {totalPages}
      </span>
      <button 
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="w-12 h-12 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
