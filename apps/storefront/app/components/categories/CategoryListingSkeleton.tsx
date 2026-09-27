import { ProductGridSkeleton } from "../products/ProductCardSkeleton";

export function CategoryListingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading category"
      className="bg-surface-base font-body-md text-on-surface"
      data-testid="category-listing-skeleton"
    >


      {/* Filter Chips Skeleton */}
      <section className="border-b border-border-subtle bg-surface-base py-4">
        <div className="mx-auto w-full max-w-[1180px] px-4">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-border-subtle" />
            <div className="h-4 w-32 rounded bg-surface-subtle animate-pulse" />
            <span className="h-px w-10 bg-border-subtle" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`chip-skeleton-${i}`}
                className="h-8 w-24 rounded-full bg-surface-subtle animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid Skeleton */}
      <section className="bg-surface-base px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-[1180px]">
          <ProductGridSkeleton count={12} />
        </div>
      </section>
    </div>
  );
}
