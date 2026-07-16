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

export function FilterChips({ categories, activeCategory, onSelect }: FilterChipsProps) {
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
      left: direction === "left" ? -node.clientWidth * 0.7 : node.clientWidth * 0.7,
      behavior: "smooth",
    });
  }, []);

  const hasControls = canScrollLeft || canScrollRight;

  return (
    <div className="relative mx-auto w-full max-w-[1060px]">
      {hasControls ? (
        <div className="pointer-events-none absolute inset-y-0 -left-4 -right-4 z-10 flex items-center justify-between md:-left-5 md:-right-5">
          <button
            type="button"
            aria-label="Scroll filters left"
            className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-base text-brand-strong shadow-sm transition-opacity ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
            disabled={!canScrollLeft}
            onClick={() => scrollByDirection("left")}
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.8]" />
          </button>
          <button
            type="button"
            aria-label="Scroll filters right"
            className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-surface-base text-brand-strong shadow-sm transition-opacity ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
            disabled={!canScrollRight}
            onClick={() => scrollByDirection("right")}
          >
            <ChevronRight className="h-4 w-4 stroke-[1.8]" />
          </button>
        </div>
      ) : null}

      <div
        ref={scrollerRef}
        className="flex items-center gap-2 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.handle || (!activeCategory && cat.handle === "");

          return (
            <button
              key={cat.handle || "all"}
              type="button"
              onClick={() => onSelect?.(cat.handle)}
              className={`shrink-0 rounded-full border px-4 py-1.5 font-label-md text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                isActive
                  ? "border-brand-strong bg-brand-strong text-white"
                  : "border-border-subtle bg-surface-subtle text-brand-strong hover:border-brand-support hover:text-brand-support"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
