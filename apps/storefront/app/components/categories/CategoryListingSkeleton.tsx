import { ProductGridSkeleton } from "../products/ProductCardSkeleton";
import { BadgeCheck, ClipboardCheck, ShieldCheck, Truck } from "lucide-react";

export function CategoryListingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading category"
      className="bg-surface-base font-body-md text-on-surface"
      data-testid="category-listing-skeleton"
    >
      {/* Hero Banner Skeleton */}
      <section className="relative isolate overflow-hidden bg-brand-hero text-white">
        <div className="absolute inset-0 -z-20 bg-[url('/category_bg.jpg')] bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-hero via-brand-strong/94 to-brand-hero/62" />
        <div className="absolute inset-y-0 left-0 -z-10 hidden w-[64%] bg-brand-hero/50 md:block" />
        <div className="absolute inset-y-0 left-[51%] z-0 hidden w-3 -skew-x-[18deg] bg-white md:block" />

        <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-0 md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.78fr)] lg:min-h-[340px]">
          <div className="relative z-10 px-5 pb-9 pt-8 md:px-8 md:pb-10 md:pt-11 lg:pl-12">
            {/* Breadcrumb Skeleton */}
            <div className="mb-5 flex items-center gap-2">
              <div className="h-3 w-16 rounded bg-white/30 animate-pulse" />
              <span className="text-white/40">›</span>
              <div className="h-3 w-28 rounded bg-white/30 animate-pulse" />
            </div>

            {/* Eyebrow badge skeleton */}
            <div className="mb-4 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-2">
              <span className="h-2 w-2 bg-brand-accent" />
              <div className="h-3 w-20 rounded bg-white/30 animate-pulse" />
            </div>

            {/* Title Skeleton */}
            <div className="space-y-3">
              <div className="h-10 w-3/4 max-w-[480px] rounded bg-white/30 animate-pulse md:h-14 lg:h-16" />
            </div>

            {/* Description Skeleton */}
            <div className="mt-5 space-y-2">
              <div className="h-4 w-full max-w-[560px] rounded bg-white/20 animate-pulse" />
              <div className="h-4 w-2/3 max-w-[380px] rounded bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Right Hero Image Area Skeleton */}
          <div className="relative z-10 hidden min-h-[250px] overflow-hidden border-t-4 border-white bg-brand-strong md:block md:min-h-full md:border-t-0 md:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
            <div className="absolute inset-0 bg-[url('/category_bg.jpg')] bg-cover bg-center opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-support/20 via-brand-hero/10 to-brand-hero/75" />
            <div className="flex h-full w-full items-center justify-center p-12">
              <div className="h-48 w-48 rounded-lg bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="relative bg-brand-strong text-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-white" />
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 divide-x divide-y divide-white/12 px-5 md:grid-cols-4 md:divide-y-0 md:px-8">
          {[
            { icon: ClipboardCheck, label: "Duyệt mẫu trước khi sản xuất" },
            { icon: BadgeCheck, label: "Chất lượng gia công ổn định" },
            { icon: Truck, label: "Giao hàng toàn quốc" },
            { icon: ShieldCheck, label: "Tư vấn chọn mẫu đúng nhu cầu" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex min-h-[76px] items-center justify-center gap-3 px-3 py-4 text-center"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-white">
                <item.icon className="h-7 w-7" />
              </span>
              <span className="font-heading text-[17px] uppercase leading-none text-white md:text-[20px]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

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
