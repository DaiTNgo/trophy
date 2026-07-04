import type { ReactNode } from "react";

export function ProductInfo({
  title,
  price,
  rating,
  reviewsCount,
  description,
  specs,
  variantSelector,
  customizationSection,
}: {
  title: string;
  price: string;
  rating: number;
  reviewsCount: number;
  description: string;
  specs: Record<string, string>;
  variantSelector?: ReactNode;
  customizationSection?: ReactNode;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="lg:col-span-5 flex flex-col gap-10">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase mb-2">
          {title}
        </h1>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex text-primary">
            {Array.from({ length: fullStars }).map((_, i) => (
              <span
                key={`full-${i}`}
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
            ))}
            {hasHalfStar ? (
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star_half
              </span>
            ) : null}
          </div>
          <span className="text-on-surface-variant font-label-md">({reviewsCount} Reviews)</span>
        </div>
        <div className="text-primary font-headline-md text-headline-md tracking-tight">
          {price}
        </div>
      </div>

      <div className="h-px bg-outline-variant w-full" />

      <div className="space-y-8">
        {variantSelector}
        {customizationSection}
      </div>

      <div className="flex flex-col gap-4">
        <button className="w-full bg-primary text-white py-5 font-label-md tracking-[2px] uppercase shadow-md hover:bg-surface-tint transition-all active:scale-[0.98] flex items-center justify-center gap-3">
          <span className="material-symbols-outlined">shopping_bag</span>
          Add to Cart
        </button>
        <button className="w-full border-2 border-primary text-primary py-5 font-label-md tracking-[2px] uppercase hover:bg-primary hover:text-white transition-all active:scale-[0.98]">
          Quick Buy
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">workspace_premium</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Handcrafted</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Premium materials only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">local_shipping</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Fast Shipping</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Global express delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">verified_user</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Safe Payment</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Secure encryption</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="material-symbols-outlined text-primary">history_edu</span>
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Legacy Brand</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Since 1988</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-outline-variant">
        <details className="group py-6" open>
          <summary className="flex justify-between items-center cursor-pointer list-none font-label-md uppercase text-on-surface">
            Product Description
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="mt-4 text-on-surface-variant font-body-md leading-relaxed">
            {description}
          </div>
        </details>
        <details className="group py-6">
          <summary className="flex justify-between items-center cursor-pointer list-none font-label-md uppercase text-on-surface">
            Specifications
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-y-3 text-[14px]">
            {Object.entries(specs).map(([name, value]) => (
              <div key={name} className="contents">
                <span className="text-on-surface-variant">{name}:</span>
                <span className="text-on-surface font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
