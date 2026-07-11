import { Link } from "react-router";
import {
  BadgeCheck,
  ChevronRight,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from "lucide-react";
import { FilterChips, type CategoryOption } from "./FilterChips";
import { ProductCard } from "../shared/ProductCard";
import { Pagination } from "../shared/Pagination";
import type { StorefrontProductItem } from "@/lib/api";
import { getLocalized } from "@/lib/translation";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type TrustItem = {
  icon: "support" | "shipping" | "quality" | "secure";
  label: string;
};

type ProductListingShellProps = {
  breadcrumbs: BreadcrumbItem[];
  eyebrow: string;
  title: string;
  description: string;
  featuredImageSrc?: string | null;
  featuredImageAlt?: string;
  products: StorefrontProductItem[];
  locale?: string;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  filters?: {
    categories: CategoryOption[];
    activeCategory?: string;
    onSelect: (categoryHandle: string) => void;
  };
  emptyState: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

const trustItems: TrustItem[] = [
  { icon: "support", label: "Thiết kế theo yêu cầu" },
  { icon: "shipping", label: "Duyệt mẫu nhanh" },
  { icon: "quality", label: "Gia công chuẩn quà tặng" },
  { icon: "secure", label: "Tư vấn và giao hàng toàn quốc" },
];

function TrustIcon({ icon }: { icon: TrustItem["icon"] }) {
  switch (icon) {
    case "shipping":
      return <Truck className="h-4 w-4" />;
    case "quality":
      return <BadgeCheck className="h-4 w-4" />;
    case "secure":
      return <ShieldCheck className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

export function ProductListingShell({
  breadcrumbs,
  eyebrow,
  title,
  description,
  featuredImageSrc,
  featuredImageAlt,
  products,
  locale = "vi",
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  filters,
  emptyState,
}: ProductListingShellProps) {
  const heroImage = featuredImageSrc ?? products[0]?.thumbnail ?? null;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <main className="mx-auto w-full max-w-container-max px-margin-mobile pb-14 md:px-margin-desktop md:pb-20">
        <section className="overflow-hidden border-x border-b border-border-subtle bg-brand-hero text-text-on-dark">
          <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-stretch lg:gap-10">
            <div className="space-y-6">
              <nav className="flex flex-wrap items-center gap-2 text-[11px] font-label-md uppercase tracking-[0.16em] text-white/72">
                {breadcrumbs.map((item, index) => (
                  <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
                    {item.href ? (
                      <Link to={item.href} className="transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-white">{item.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                  </span>
                ))}
              </nav>

              <div className="space-y-4">
                <p className="font-label-md text-[12px] uppercase tracking-[0.28em] text-brand-accent">
                  {eyebrow}
                </p>
                <div className="max-w-[760px] space-y-4">
                  <h1 className="font-heading text-[42px] uppercase leading-none md:text-[56px] lg:text-[64px]">
                    {title}
                  </h1>
                  <p className="max-w-[620px] font-body-md text-body-md leading-7 text-white/82">
                    {description}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {trustItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-h-12 items-center gap-3 rounded-sm border border-white/14 bg-white/6 px-4 py-3"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-support/22 text-white">
                      <TrustIcon icon={item.icon} />
                    </span>
                    <span className="text-[12px] font-label-md uppercase tracking-[0.12em] text-white/88">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-white/14 bg-white/8 p-4">
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-sm bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] p-6">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={featuredImageAlt ?? title}
                    className="max-h-[320px] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-sm border border-dashed border-white/18 text-white/55">
                    <Package className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-x border-b border-border-subtle bg-surface-base">
          <div className="flex flex-col gap-5 px-6 py-5 md:px-10 md:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-container text-brand-strong">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-label-md text-[12px] uppercase tracking-[0.18em] text-brand-support">
                    Bộ lọc sản phẩm
                  </p>
                  <p className="font-body-md text-sm text-on-surface-variant">
                    Hiển thị {products.length} sản phẩm trên tổng {totalItems} kết quả
                  </p>
                </div>
              </div>

              {filters ? (
                <div className="font-label-md text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Danh mục
                </div>
              ) : (
                <div className="font-label-md text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                  Bộ sưu tập
                </div>
              )}
            </div>

            {filters ? (
              <FilterChips
                categories={filters.categories}
                activeCategory={filters.activeCategory}
                onSelect={filters.onSelect}
              />
            ) : null}
          </div>
        </section>

        <section className="border-x border-b border-border-subtle bg-background px-4 py-8 md:px-8 md:py-10">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border-subtle bg-surface-panel px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-brand-strong">
                <Package className="h-8 w-8" />
              </div>
              <h2 className="mt-6 font-heading text-[30px] uppercase leading-none text-brand-strong">
                {emptyState.title}
              </h2>
              <p className="mt-3 max-w-[560px] font-body-md text-body-md text-on-surface-variant">
                {emptyState.description}
              </p>
              <Link
                to={emptyState.ctaHref}
                className="mt-8 inline-flex items-center justify-center rounded-sm bg-action-support px-6 py-3 font-label-md text-label-md uppercase tracking-[0.12em] text-white transition-colors hover:bg-action-support-hover"
              >
                {emptyState.ctaLabel}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    title={getLocalized(product.title, locale)}
                    subtitle={getLocalized(product.subtitle, locale) || null}
                    categorySummary={getLocalized(product.categorySummary, locale) || null}
                    imageAlt={getLocalized(product.title, locale)}
                  />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
