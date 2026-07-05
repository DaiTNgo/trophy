import type { ReactNode } from "react";
import { Link } from "react-router";
import { Star, StarHalf, Phone, ShoppingBag, Award, Truck, ShieldCheck, ScrollText, ChevronDown } from "lucide-react";

export function ProductInfo({
  title,
  price,
  rating,
  reviewsCount,
  description,
  specs,
  variantSelector,
  customizationSection,
  isContactPrice,
  contactHref,
  primaryActionLabel,
  primaryActionDisabled,
  primaryActionMessage,
  onPrimaryAction,
}: {
  title: string;
  price: string;
  rating: number;
  reviewsCount: number;
  description: string;
  specs: Record<string, string>;
  variantSelector?: ReactNode;
  customizationSection?: ReactNode;
  isContactPrice?: boolean;
  contactHref?: string;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  primaryActionMessage?: string;
  onPrimaryAction: () => void;
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
              <Star
                key={`full-${i}`}
                className="text-primary"
                fill="currentColor"
              />
            ))}
            {hasHalfStar ? (
              <StarHalf
                className="text-primary"
                fill="currentColor"
              />
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
        {isContactPrice ? (
          <Link
            to={contactHref ?? "/contact"}
            className="w-full bg-surface-variant text-on-surface-variant py-5 font-label-md tracking-[2px] uppercase flex items-center justify-center gap-3 opacity-80"
          >
            <Phone />
            Contact for Pricing
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              className="w-full bg-primary text-white py-5 font-label-md tracking-[2px] uppercase shadow-md hover:bg-surface-tint transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingBag />
              {primaryActionLabel}
            </button>
            <Link
              to="/cart"
              className="w-full border-2 border-primary text-primary py-5 font-label-md tracking-[2px] uppercase hover:bg-primary hover:text-white transition-all active:scale-[0.98] text-center"
            >
              View Cart
            </Link>
          </>
        )}
        {primaryActionMessage ? (
          <p className="text-sm text-on-surface-variant">{primaryActionMessage}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
            <Award className="text-primary" />
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Handcrafted</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Premium materials only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <Truck className="text-primary" />
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Fast Shipping</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Global express delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <ShieldCheck className="text-primary" />
          <div>
            <p className="font-label-md text-on-surface uppercase leading-none">Safe Payment</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Secure encryption</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <ScrollText className="text-primary" />
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
            <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-4 text-on-surface-variant font-body-md leading-relaxed">
            {description}
          </div>
        </details>
        <details className="group py-6">
          <summary className="flex justify-between items-center cursor-pointer list-none font-label-md uppercase text-on-surface">
            Specifications
            <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
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
