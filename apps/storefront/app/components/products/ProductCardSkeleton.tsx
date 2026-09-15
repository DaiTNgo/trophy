export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col rounded-lg p-3 animate-pulse"
      data-testid="product-card-skeleton"
    >
      <div className="relative mb-4 aspect-square w-full rounded-md bg-surface-subtle" />
      <div className="flex w-full flex-1 flex-col items-center px-1">
        <div className="mb-2 h-5 w-3/4 max-w-[200px] rounded bg-surface-subtle" />
        <div className="mb-2 h-3 w-1/2 max-w-[120px] rounded bg-surface-subtle" />
        <div className="h-4 w-1/3 max-w-[90px] rounded bg-surface-subtle" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className="grid grid-cols-2 gap-x-5 gap-y-11 sm:grid-cols-3 lg:grid-cols-4 md:gap-x-8 lg:gap-x-10 md:gap-y-12"
      data-testid="product-grid-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={`product-skeleton-${index}`} />
      ))}
    </div>
  );
}
