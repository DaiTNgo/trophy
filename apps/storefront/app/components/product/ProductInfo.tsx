import type { ReactNode } from "react";
import { Link } from "react-router";
import { Award, ChevronDown, Phone, ScrollText, ShieldCheck, ShoppingBag, Star, StarHalf, Truck } from "lucide-react";

export function ProductInfo({
  title,
  price,
  rating,
  reviewsCount,
  variantSelector,
  customizationSection,
  isContactPrice,
  contactHref,
  primaryActionLabel,
  primaryActionDisabled,
  primaryActionMessage,
  onPrimaryAction,
  flatCustomization = false,
}: {
  title: string;
  price: string;
  rating: number;
  reviewsCount: number;
  variantSelector?: ReactNode;
  customizationSection?: ReactNode;
  isContactPrice?: boolean;
  contactHref?: string;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  primaryActionMessage?: string;
  onPrimaryAction: () => void;
  flatCustomization?: boolean;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  if (flatCustomization) {
    return (
      <aside className="rounded-[14px] border border-[#d8c1ad] bg-white p-5 md:p-6">
        <div className="mb-7 border-b border-[#d8c1ad] pb-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#7b6b5f]">Customize product</p>
          <h1 className="mt-2 text-[clamp(28px,3vw,42px)] font-semibold leading-[1.05] text-[#2d4056]">
            {title}
          </h1>
          <div className="mt-4 flex items-end justify-between gap-4">
            <p className="text-[clamp(22px,2.5vw,32px)] font-semibold leading-none text-[#110023]">{price}</p>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b6b5f]">
              {reviewsCount} reviews
            </span>
          </div>
        </div>
        <div className="space-y-8">
        {variantSelector ? <div className="space-y-8">{variantSelector}</div> : null}
        {customizationSection}
        <div className="space-y-3">
          {isContactPrice ? (
            <Link
              to={contactHref ?? "/contact"}
              className="flex h-16 w-full items-center justify-center rounded-[14px] bg-[#110023] px-6 text-[clamp(20px,2vw,26px)] font-normal leading-none text-white transition hover:bg-[#1d0738]"
            >
              Contact for Pricing
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              className="flex h-16 w-full items-center justify-center rounded-[14px] bg-[#110023] px-6 text-[clamp(20px,2vw,26px)] font-normal leading-none text-white transition hover:bg-[#1d0738] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {primaryActionLabel}
            </button>
          )}
          {primaryActionMessage ? (
            <p className="text-sm text-on-surface-variant">{primaryActionMessage}</p>
          ) : null}
        </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="space-y-5">
      <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-[0_10px_40px_rgba(28,27,27,0.06)] md:p-6">
        <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.18em] text-primary">
          Personalized award
        </p>
        <h1 className="mb-3 font-headline-lg text-headline-lg uppercase text-on-surface">
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
        <div className="border-t border-outline-variant pt-4 text-primary font-headline-md text-headline-md tracking-tight">
          {price}
        </div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-[0_10px_40px_rgba(28,27,27,0.06)] md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <p className="font-label-md text-label-md uppercase tracking-[0.14em] text-on-surface">
              Studio setup
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Choose production details, then fill the personalization form.
            </p>
          </div>
        </div>
        <div className="space-y-7">{variantSelector}{customizationSection}</div>
      </div>

      <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-[0_10px_40px_rgba(28,27,27,0.06)] md:p-6">
        <div className="flex flex-col gap-4">
        {isContactPrice ? (
          <Link
            to={contactHref ?? "/contact"}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-surface-variant py-5 font-label-md uppercase tracking-[2px] text-on-surface-variant transition hover:bg-surface-container-high"
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
              className="flex w-full items-center justify-center gap-3 rounded-md bg-primary py-5 font-label-md uppercase tracking-[2px] text-white shadow-md transition-all hover:bg-surface-tint active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingBag />
              {primaryActionLabel}
            </button>
            <Link
              to="/cart"
              className="w-full rounded-md border-2 border-primary py-5 text-center font-label-md uppercase tracking-[2px] text-primary transition-all hover:bg-primary hover:text-white active:scale-[0.98]"
            >
              View Cart
            </Link>
          </>
        )}
        {primaryActionMessage ? (
          <p className="text-sm text-on-surface-variant">{primaryActionMessage}</p>
        ) : null}
      </div>
      </div>
    </aside>
  );
}

export function ProductDetailSections({
  description,
  specs,
}: {
  description: string;
  specs: Record<string, string>;
}) {
  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="flex items-center gap-3 rounded-[14px] border border-[#d8c1ad] bg-white p-4">
          <Award className="text-[#110023]" />
          <div>
            <p className="font-label-md text-[#2d4056] uppercase leading-none">Handcrafted</p>
            <p className="mt-1 text-[11px] text-[#7b6b5f]">Premium materials only</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-[#d8c1ad] bg-white p-4">
          <Truck className="text-[#110023]" />
          <div>
            <p className="font-label-md text-[#2d4056] uppercase leading-none">Fast Shipping</p>
            <p className="mt-1 text-[11px] text-[#7b6b5f]">Global express delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-[#d8c1ad] bg-white p-4">
          <ShieldCheck className="text-[#110023]" />
          <div>
            <p className="font-label-md text-[#2d4056] uppercase leading-none">Safe Payment</p>
            <p className="mt-1 text-[11px] text-[#7b6b5f]">Secure encryption</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-[#d8c1ad] bg-white p-4">
          <ScrollText className="text-[#110023]" />
          <div>
            <p className="font-label-md text-[#2d4056] uppercase leading-none">Legacy Brand</p>
            <p className="mt-1 text-[11px] text-[#7b6b5f]">Since 1988</p>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#d8c1ad] bg-white p-6 md:p-8">
        <div className="divide-y divide-[#d8c1ad]">
        <details className="group py-6" open>
          <summary className="flex cursor-pointer list-none items-center justify-between font-label-md uppercase text-[#2d4056]">
            Product Description
            <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-4 font-body-md leading-relaxed text-[#7b6b5f]">
            {description}
          </div>
        </details>
        <details className="group py-6">
          <summary className="flex cursor-pointer list-none items-center justify-between font-label-md uppercase text-[#2d4056]">
            Specifications
            <ChevronDown className="transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-y-3 text-[14px]">
            {Object.entries(specs).map(([name, value]) => (
              <div key={name} className="contents">
                <span className="text-[#7b6b5f]">{name}:</span>
                <span className="font-semibold text-[#2d4056]">{value}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
      </div>
    </section>
  );
}
