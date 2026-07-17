import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Container } from "@/components/container";
import type { StorefrontCategory } from "@/lib/api";
import { getActiveCategoryHandle, getCategoryPath } from "@/lib/storefront-paths";
import { getLocalized } from "@/lib/translation";

interface NavbarCategoryStripProps {
  categories: StorefrontCategory[];
  locale?: string;
  hideOnMobile?: boolean;
}

export function NavbarCategoryStrip({
  categories,
  locale = "vi",
  hideOnMobile = false,
}: NavbarCategoryStripProps) {
  const { pathname } = useLocation();
  const activeCategoryHandle = getActiveCategoryHandle(pathname);
  const categoryStripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false);

  const updateCategoryStripScrollState = useCallback(() => {
    const node = categoryStripRef.current;

    if (!node) {
      setCanScrollCategoriesLeft(false);
      setCanScrollCategoriesRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const hasOverflow = maxScrollLeft > 1;

    setCanScrollCategoriesLeft(hasOverflow && node.scrollLeft > 1);
    setCanScrollCategoriesRight(hasOverflow && node.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const node = categoryStripRef.current;

    if (!node) {
      return;
    }

    updateCategoryStripScrollState();
    node.addEventListener("scroll", updateCategoryStripScrollState, {
      passive: true,
    });
    window.addEventListener("resize", updateCategoryStripScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateCategoryStripScrollState)
        : null;

    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateCategoryStripScrollState);
      window.removeEventListener("resize", updateCategoryStripScrollState);
      resizeObserver?.disconnect();
    };
  }, [categories.length, updateCategoryStripScrollState]);

  const scrollCategories = useCallback((direction: "left" | "right") => {
    const node = categoryStripRef.current;

    if (!node) return;

    node.scrollBy({
      left:
        direction === "left" ? -node.clientWidth * 0.75 : node.clientWidth * 0.75,
      behavior: "smooth",
    });
  }, []);

  const hasCategoryStripControls =
    canScrollCategoriesLeft || canScrollCategoriesRight;

  if (categories.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative z-10 w-full border-y border-gray-100 bg-white ${
        hideOnMobile ? "hidden lg:block" : "hidden sm:block"
      }`}
    >
      <Container className="relative py-3">
        <div className="relative">
          {hasCategoryStripControls ? (
            <div className="pointer-events-none absolute inset-y-0 -left-4 -right-4 z-10 flex items-center justify-between">
              <button
                type="button"
                aria-label="Scroll categories left"
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-opacity ${
                  canScrollCategoriesLeft ? "opacity-100" : "opacity-0"
                }`}
                disabled={!canScrollCategoriesLeft}
                onClick={() => scrollCategories("left")}
              >
                <ChevronLeft className="h-5 w-5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition-opacity ${
                  canScrollCategoriesRight ? "opacity-100" : "opacity-0"
                }`}
                disabled={!canScrollCategoriesRight}
                onClick={() => scrollCategories("right")}
              >
                <ChevronRight className="h-5 w-5 stroke-[1.5]" />
              </button>
            </div>
          ) : null}

          <div
            ref={categoryStripRef}
            className="flex gap-4 overflow-x-auto scroll-smooth md:gap-8"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeCategoryHandle === cat.handle;

              return (
                <Link
                  key={cat.id}
                  to={getCategoryPath(cat.handle)}
                  aria-current={isActive ? "page" : undefined}
                  className="block shrink-0 basis-1/4 md:basis-1/5 lg:basis-auto"
                >
                  <div
                    className={`mx-auto mb-1 h-[65px] w-[65px] overflow-hidden rounded-lg border transition-colors lg:hidden ${
                      isActive
                        ? "border-brand-strong bg-brand-strong/5"
                        : "border-transparent bg-gray-100"
                    }`}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={getLocalized(cat.name, locale)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center ${
                          isActive ? "text-brand-strong" : "text-gray-300"
                        }`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <span
                    className={`relative block pb-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors lg:text-left lg:text-[13px] lg:whitespace-nowrap ${
                      isActive
                        ? "text-brand-strong"
                        : "text-brand-strong hover:text-brand-support"
                    }`}
                  >
                    {getLocalized(cat.name, locale)}
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-brand-strong transition-all lg:left-0 lg:translate-x-0 ${
                        isActive ? "w-8 opacity-100" : "w-0 opacity-0"
                      }`}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </div>
  );
}
