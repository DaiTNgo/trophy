import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Award,
  ChevronDown,
  Minus,
  Package,
  Phone,
  Plus,
  Star,
  StarHalf,
  Truck,
  Zap,
} from "lucide-react";

export function ProductInfo({
  title,
  price,
  rating,
  reviewsCount,
  description,
  badges,
  variantSelector,
  customizationSection,
  isContactPrice,
  contactHref,
  primaryActionLabel,
  primaryActionDisabled,
  primaryActionMessage,
  previewRef,
  onPrimaryAction,
  flatCustomization = false,
}: {
  title: string;
  price: string;
  rating: number;
  reviewsCount: number;
  description?: string;
  badges?: Array<{ icon?: ReactNode; label: string }>;
  variantSelector?: ReactNode;
  customizationSection?: ReactNode;
  isContactPrice?: boolean;
  contactHref?: string;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  primaryActionMessage?: string;
  previewRef?: React.RefObject<HTMLElement | null>;
  onPrimaryAction: () => void;
  flatCustomization?: boolean;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  const defaultBadges: Array<{ icon: ReactNode; label: string }> = [
    { icon: <Package className="size-3.5" />, label: "Custom Design" },
    { icon: <Award className="size-3.5" />, label: "Superior Quality" },
    { icon: <Truck className="size-3.5" />, label: "Fast Shipping" },
  ];
  const displayBadges = badges ?? defaultBadges;

  // Stars
  const starsEl = (
    <div className="flex items-center gap-2">
      <div className="flex text-indicator-rating">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="size-4" fill="currentColor" />
        ))}
        {hasHalfStar ? (
          <StarHalf className="size-4" fill="currentColor" />
        ) : null}
      </div>
      {reviewsCount > 0 ? (
        <span className="text-sm text-text-muted">({reviewsCount})</span>
      ) : null}
    </div>
  );

  // CTA buttons
  const ctaButtons = (
    <div className="space-y-2.5">
      {isContactPrice ? (
        <Link
          to={contactHref ?? "/contact"}
          className="flex h-12 w-full items-center justify-center gap-2 rounded bg-brand-hero px-6 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-90"
        >
          <Phone className="size-4" />
          Contact for Pricing
        </Link>
      ) : (
        <>
          {/* Preview button — scrolls to canvas on the left */}
          <button
            type="button"
            onClick={() => {
              previewRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded border-2 border-brand-strong bg-white px-6 text-sm font-bold uppercase tracking-[0.1em] text-brand-strong transition hover:bg-surface-subtle"
          >
            <Zap className="size-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded bg-action-commerce px-6 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:bg-action-commerce-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryActionLabel}
          </button>
        </>
      )}
      {primaryActionMessage ? (
        <p className="text-xs text-text-muted">{primaryActionMessage}</p>
      ) : null}
    </div>
  );

  if (flatCustomization) {
    return (
      <aside className="space-y-0">
        {/* Title + Rating + Price block */}
        <div className="mb-5">
          <h1 className="mb-2 font-heading text-[34px] uppercase leading-none tracking-[0.02em] text-brand-strong">
            {title}
          </h1>
          <div className="mb-3 flex items-center gap-3">
            {starsEl}
          </div>
          <p className="font-heading text-[32px] uppercase leading-none tracking-[0.02em] text-action-positive">{price}</p>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-text-base">{description}</p>
          ) : null}
        </div>

        {/* Feature badges */}
        {displayBadges.length > 0 ? (
          <div className="mb-5 flex flex-wrap gap-4 border-y border-border-subtle py-3">
            {displayBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-strong">
                <span className="text-brand-accent">{badge.icon}</span>
                {badge.label}
              </div>
            ))}
          </div>
        ) : null}

        {/* Variant options */}
        {variantSelector ? (
          <div className="mb-5 space-y-4">{variantSelector}</div>
        ) : null}

        {/* Customization form */}
        {customizationSection ? (
          <div className="mb-5">{customizationSection}</div>
        ) : null}

        {/* CTA */}
        {ctaButtons}
      </aside>
    );
  }

  return (
    <aside className="space-y-5">
      <div className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
        <h1 className="mb-2 font-heading text-[34px] uppercase leading-none tracking-[0.02em] text-brand-strong">
          {title}
        </h1>
        <div className="mb-3 flex items-center gap-3">
          {starsEl}
        </div>
        <p className="mb-4 font-heading text-[32px] uppercase leading-none tracking-[0.02em] text-action-positive">{price}</p>
        {description ? (
          <p className="mb-4 text-sm leading-relaxed text-text-base">{description}</p>
        ) : null}
        {displayBadges.length > 0 ? (
          <div className="flex flex-wrap gap-4 border-t border-border-subtle pt-4">
            {displayBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-strong">
                <span className="text-brand-accent">{badge.icon}</span>
                {badge.label}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {variantSelector || customizationSection ? (
        <div className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
          <div className="space-y-5">
            {variantSelector}
            {customizationSection}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
        {ctaButtons}
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
    <section className="mt-10 rounded-lg border border-border-subtle bg-white">
      <div className="divide-y divide-border-subtle">
        <details className="group" open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-text-base">
            <span className="flex items-center gap-2">
              <Award className="size-4 text-text-muted" />
              Why This Product?
            </span>
            <ChevronDown className="size-4 text-text-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6 text-sm leading-relaxed text-text-muted">
            {description}
          </div>
        </details>

        {Object.keys(specs).length > 0 ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-text-base">
              <span className="flex items-center gap-2">
                <Package className="size-4 text-text-muted" />
                Specifications
              </span>
              <ChevronDown className="size-4 text-text-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(specs).map(([name, value]) => (
                  <div key={name} className="contents">
                    <span className="text-text-muted">{name}:</span>
                    <span className="font-semibold text-text-base">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ) : null}

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-text-base">
            <span className="flex items-center gap-2">
              <Truck className="size-4 text-text-muted" />
              Shipping &amp; Fulfillment
            </span>
            <ChevronDown className="size-4 text-text-muted transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6 text-sm leading-relaxed text-text-muted">
            Orders are typically processed within 1–2 business days. Production
            takes 5–7 business days. Standard shipping is 3–5 days after
            dispatch. Express options available at checkout.
          </div>
        </details>
      </div>
    </section>
  );
}
