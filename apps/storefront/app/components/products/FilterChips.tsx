import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CategoryOption {
  name: string;
  handle: string;
}

export interface FilterChipsProps {
  categories: CategoryOption[];
  activeCategory?: string;
  onSelect?: (categoryHandle: string) => void;
}

export function FilterChips({
  categories,
  activeCategory,
  onSelect,
}: FilterChipsProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const node = scrollerRef.current;

    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    setCanScrollLeft(hasOverflow && node.scrollLeft > 1);
    setCanScrollRight(hasOverflow && node.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;

    if (!node) return;

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScrollState)
        : null;

    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [categories.length, updateScrollState]);

  const scrollByDirection = useCallback((direction: "left" | "right") => {
    const node = scrollerRef.current;

    if (!node) return;

    node.scrollBy({
      left:
        direction === "left" ? -node.clientWidth * 0.7 : node.clientWidth * 0.7,
      behavior: "smooth",
    });
  }, []);

  const hasControls = canScrollLeft || canScrollRight;

  return (
    <div className="relative mx-auto w-full max-w-[1200px] px-8 sm:px-11">
      {hasControls ? (
        <button
          type="button"
          aria-label="Previous"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-brand-strong shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 transition-all duration-150 ${
            canScrollLeft
              ? "opacity-100 hover:scale-105 cursor-pointer"
              : "opacity-25 cursor-not-allowed pointer-events-none"
          }`}
          disabled={!canScrollLeft}
          onClick={() => scrollByDirection("left")}
        >
          <ChevronLeft className="h-4 w-4 stroke-[2.2]" />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className="flex items-center overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="mx-auto flex min-w-max items-center justify-center gap-2.5 sm:gap-3 py-1">
          {categories.map((cat) => {
            const isActive =
              activeCategory === cat.handle ||
              (!activeCategory && cat.handle === "");

            return (
              <button
                key={cat.handle || "all"}
                type="button"
                onClick={() => onSelect?.(cat.handle)}
                className={`shrink-0 rounded-full px-5 py-2 font-heading text-[13px] sm:text-[14px] font-bold uppercase tracking-[0.04em] transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "bg-brand-strong text-white"
                    : "bg-[#edf0f4] text-brand-strong hover:bg-[#dfe4ea]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {hasControls ? (
        <button
          type="button"
          aria-label="Next"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-brand-strong shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-slate-100 transition-all duration-150 ${
            canScrollRight
              ? "opacity-100 hover:scale-105 cursor-pointer"
              : "opacity-25 cursor-not-allowed pointer-events-none"
          }`}
          disabled={!canScrollRight}
          onClick={() => scrollByDirection("right")}
        >
          <ChevronRight className="h-4 w-4 stroke-[2.2]" />
        </button>
      ) : null}
    </div>
  );
}
