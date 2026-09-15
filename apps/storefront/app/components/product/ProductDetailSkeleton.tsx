import Container from "../container";
import { ProductGridSkeleton } from "../products/ProductCardSkeleton";

export function ProductDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product details"
      className="bg-surface-base py-4 pb-24 md:pb-12 text-text-base"
      data-testid="product-detail-skeleton"
    >
      <Container className="px-4 md:px-6">
        {/* Breadcrumb Skeleton */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3.5 w-16 rounded bg-surface-subtle animate-pulse" />
          <span className="text-text-muted/40">/</span>
          <div className="h-3.5 w-24 rounded bg-surface-subtle animate-pulse" />
          <span className="text-text-muted/40">/</span>
          <div className="h-3.5 w-36 rounded bg-surface-subtle animate-pulse" />
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start xl:grid-cols-[minmax(0,1fr)_520px]">
          {/* Left Column: Gallery */}
          <div className="flex flex-col gap-4">
            <div className="h-[clamp(280px,45svh,420px)] lg:h-[min(65vh,640px)] w-full rounded-lg bg-surface-subtle animate-pulse" />
            <div className="flex gap-3 overflow-hidden py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`thumb-skeleton-${i}`}
                  className="h-16 w-16 shrink-0 rounded-md bg-surface-subtle animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="flex flex-col gap-5 pt-2">
            {/* Category / Subtitle */}
            <div className="h-4 w-28 rounded bg-surface-subtle animate-pulse" />

            {/* Title (2 lines) */}
            <div className="space-y-2">
              <div className="h-8 w-4/5 rounded bg-surface-subtle animate-pulse" />
              <div className="h-8 w-3/5 rounded bg-surface-subtle animate-pulse" />
            </div>

            {/* Rating / Review count */}
            <div className="h-4 w-32 rounded bg-surface-subtle animate-pulse" />

            {/* Price badge */}
            <div className="h-8 w-40 rounded bg-surface-subtle animate-pulse" />

            {/* Divider */}
            <div className="h-px w-full bg-border-subtle" />

            {/* Options group 1 */}
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-surface-subtle animate-pulse" />
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-md bg-surface-subtle animate-pulse" />
                <div className="h-9 w-20 rounded-md bg-surface-subtle animate-pulse" />
                <div className="h-9 w-20 rounded-md bg-surface-subtle animate-pulse" />
              </div>
            </div>

            {/* Options group 2 */}
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-surface-subtle animate-pulse" />
              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-md bg-surface-subtle animate-pulse" />
                <div className="h-9 w-24 rounded-md bg-surface-subtle animate-pulse" />
              </div>
            </div>

            {/* Quantity & CTA Button */}
            <div className="mt-2 space-y-3">
              <div className="h-11 w-32 rounded-md bg-surface-subtle animate-pulse" />
              <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
            </div>
          </div>
        </div>

        {/* Suggested Products Section Skeleton */}
        <div className="mt-16 border-t border-border-subtle pt-10">
          <div className="mb-6 h-6 w-48 rounded bg-surface-subtle animate-pulse" />
          <ProductGridSkeleton count={4} />
        </div>
      </Container>
    </div>
  );
}
