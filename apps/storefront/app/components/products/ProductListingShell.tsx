import { Link } from "react-router";
import {
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  Package,
  ShieldCheck,
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
  icon: "proof" | "shipping" | "quality" | "guarantee";
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
  categoryHandle?: string | null;
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

type ListingFilterConfig = NonNullable<ProductListingShellProps["filters"]>;
type EmptyStateConfig = ProductListingShellProps["emptyState"];

const reviewCountCycle = [0, 9, 12, 17, 21, 0, 8, 14];

const trustItems: TrustItem[] = [
  { icon: "proof", label: "Duyệt mẫu trước khi sản xuất" },
  { icon: "quality", label: "Chất lượng gia công ổn định" },
  { icon: "shipping", label: "Giao hàng toàn quốc" },
  { icon: "guarantee", label: "Tư vấn chọn mẫu đúng nhu cầu" },
];

function TrustIcon({ icon }: { icon: TrustItem["icon"] }) {
  switch (icon) {
    case "shipping":
      return <Truck className="h-7 w-7" />;
    case "quality":
      return <BadgeCheck className="h-7 w-7" />;
    case "guarantee":
      return <ShieldCheck className="h-7 w-7" />;
    default:
      return <ClipboardCheck className="h-7 w-7" />;
  }
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {item.href ? (
            <Link to={item.href} className="transition-colors hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-white">{item.label}</span>
          )}
          {index < items.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
        </span>
      ))}
    </nav>
  );
}

function ListingHero({
  breadcrumbs,
  eyebrow,
  title,
  description,
  imageSrc,
  imageAlt,
}: {
  breadcrumbs: BreadcrumbItem[];
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string | null;
  imageAlt: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-hero text-white">
      <div className="absolute inset-0 -z-20 bg-[url('/category_bg.jpg')] bg-cover bg-center opacity-80" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-hero via-brand-strong/94 to-brand-hero/62" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-[64%] bg-brand-hero/50 md:block" />
      <div className="absolute inset-y-0 left-[51%] z-0 hidden w-3 -skew-x-[18deg] bg-white md:block" />

      <div className="mx-auto grid w-full max-w-[1440px] gap-0 px-0 md:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.78fr)] lg:min-h-[340px]">
        <div className="relative z-10 px-5 pb-9 pt-8 md:px-8 md:pb-10 md:pt-11 lg:pl-12">
          <Breadcrumbs items={breadcrumbs} />

          <div className="mb-4 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-2">
            <span className="h-2 w-2 bg-brand-accent" />
            <p className="font-body-md text-[10px] font-bold uppercase tracking-[0.18em] text-white/86">
              {eyebrow}
            </p>
          </div>
          <h1 className="max-w-[640px] min-w-0 [overflow-wrap:anywhere] font-heading text-[46px] uppercase leading-[0.88] text-white md:text-[68px] lg:text-[82px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[660px] font-body-md text-[15px] font-bold leading-7 text-white/92 md:text-[18px] md:leading-8">
            {description}
          </p>
        </div>

        <div className="relative z-10 min-h-[250px] overflow-hidden border-t-4 border-white bg-brand-strong md:min-h-full md:border-t-0 md:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
          <div className="absolute inset-0 bg-[url('/category_bg.jpg')] bg-cover bg-center opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-support/20 via-brand-hero/10 to-brand-hero/75" />
          <div className="absolute bottom-0 left-[12%] right-0 h-12 border-t border-white/18 bg-brand-hero/56" />
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt}
              className="relative z-10 mx-auto h-[250px] w-full object-contain px-8 py-5 drop-shadow-2xl md:h-[330px] md:pl-16 md:pr-10"
            />
          ) : (
            <div className="relative z-10 flex h-[250px] w-full items-center justify-center text-white/45 md:h-[330px]">
              <Package className="h-16 w-16" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ListingTrustBar() {
  return (
    <section className="relative bg-brand-strong text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-white" />
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 divide-x divide-y divide-white/12 px-5 md:grid-cols-4 md:divide-y-0 md:px-8">
        {trustItems.map((item) => (
          <div key={item.label} className="flex min-h-[76px] items-center justify-center gap-3 px-3 py-4 text-center">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-white">
              <TrustIcon icon={item.icon} />
            </span>
            <span className="font-heading text-[17px] uppercase leading-none text-white md:text-[20px]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListingFilterSummary({
  filters,
  resultLabel,
  locale,
}: {
  filters?: ListingFilterConfig;
  resultLabel: string;
  locale: string;
}) {
  const title = filters
    ? locale === "en"
      ? "Filter by product"
      : "Lọc theo sản phẩm"
    : locale === "en"
      ? "Collection"
      : "Bộ sưu tập";

  return (
    <section className="border-b border-border-subtle bg-surface-base py-4">
      <div className="mx-auto w-full max-w-[1180px] px-4">
        <div className="mb-3 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-border-subtle" />
          <p className="font-heading text-[18px] uppercase leading-none text-brand-strong">
            {title}
          </p>
          <span className="h-px w-10 bg-border-subtle" />
        </div>

        {filters ? (
          <FilterChips
            categories={filters.categories}
            activeCategory={filters.activeCategory}
            onSelect={filters.onSelect}
          />
        ) : null}

        <p className="mt-3 text-center font-body-md text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {resultLabel}
        </p>
      </div>
    </section>
  );
}

function EmptyListingState({ emptyState }: { emptyState: EmptyStateConfig }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border-subtle bg-surface-panel px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle text-brand-strong">
        <Package className="h-8 w-8" />
      </div>
      <h2 className="mt-6 font-heading text-[30px] uppercase leading-none text-brand-strong">
        {emptyState.title}
      </h2>
      <p className="mt-3 max-w-[560px] font-body-md text-[14px] leading-6 text-text-muted">
        {emptyState.description}
      </p>
      <Link
        to={emptyState.ctaHref}
        className="mt-8 inline-flex items-center justify-center bg-action-support px-6 py-3 font-body-md text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-action-support-hover"
      >
        {emptyState.ctaLabel}
      </Link>
    </div>
  );
}

function ProductGrid({
  products,
  locale,
  categoryHandle,
}: {
  products: StorefrontProductItem[];
  locale: string;
  categoryHandle?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-11 md:grid-cols-3 md:gap-x-10 md:gap-y-14">
      {products.map((product, index) => {
        const title = getLocalized(product.title, locale);

        return (
          <ProductCard
            key={product.id}
            {...product}
            categoryHandle={categoryHandle}
            title={title}
            subtitle={getLocalized(product.subtitle, locale) || null}
            categorySummary={getLocalized(product.categorySummary, locale) || null}
            imageAlt={title}
            rating={5}
            reviewsCount={reviewCountCycle[index % reviewCountCycle.length]}
            variant="listing"
          />
        );
      })}
    </div>
  );
}

function ListingResults({
  products,
  locale,
  categoryHandle,
  currentPage,
  totalPages,
  onPageChange,
  emptyState,
}: {
  products: StorefrontProductItem[];
  locale: string;
  categoryHandle?: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  emptyState: EmptyStateConfig;
}) {
  return (
    <section className="bg-surface-base px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-[1040px]">
        {products.length === 0 ? (
          <EmptyListingState emptyState={emptyState} />
        ) : (
          <>
            <ProductGrid products={products} locale={locale} categoryHandle={categoryHandle} />

            {totalPages > 1 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function ListingEditorial({ title, locale }: { title: string; locale: string }) {
  const isEnglish = locale === "en";
  const normalizedTitle = title.toUpperCase();

  return (
    <section className="mx-auto w-full max-w-[920px] px-5 pb-16 pt-8 md:px-6 md:pb-20 md:pt-12">
      <div className="space-y-8 text-[13px] leading-6 text-text-base">
        <div>
          <h2 className="mb-4 font-heading text-[28px] uppercase leading-none text-brand-strong md:text-[34px]">
            {isEnglish ? `More about ${normalizedTitle}` : `Tìm hiểu thêm về ${normalizedTitle}`}
          </h2>
          <p className="mb-3">
            {isEnglish
              ? "Choose a product line by shape, material, finish, and customization needs. The listing above is built for quick comparison, so you can move from visual fit to price range without opening every product page."
              : "Chọn dòng sản phẩm theo kiểu dáng, chất liệu, hoàn thiện và nhu cầu tùy chỉnh. Danh sách phía trên được thiết kế để so sánh nhanh, giúp bạn xem hình dáng và khoảng giá trước khi mở từng sản phẩm."}
          </p>
          <p>
            {isEnglish
              ? "For team awards, internal events, school competitions, and sales recognition, prioritize the display location first. Desk trophies, plaques, medals, and premium cups each read differently in photos, on stage, and in daily office display."
              : "Với giải nội bộ, sự kiện trường học, giải đấu hoặc vinh danh doanh số, hãy bắt đầu từ nơi trưng bày. Cúp để bàn, bảng vinh danh, huy chương và cúp cao cấp tạo cảm giác rất khác nhau khi chụp ảnh, trao trên sân khấu hoặc đặt tại văn phòng."}
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-[22px] uppercase leading-none text-brand-strong md:text-[26px]">
            {isEnglish ? "Why choose Trophy products?" : "Vì sao chọn sản phẩm Trophy?"}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-1 font-body-md text-[13px] font-bold uppercase text-text-base">
                {isEnglish ? "Personalized details" : "Chi tiết cá nhân hóa"}
              </h4>
              <p className="text-text-muted">
                {isEnglish
                  ? "Names, logos, event text, and artwork can be prepared for approval before production."
                  : "Tên, logo, nội dung sự kiện và artwork có thể được chuẩn bị để duyệt trước khi sản xuất."}
              </p>
            </div>
            <div>
              <h4 className="mb-1 font-body-md text-[13px] font-bold uppercase text-text-base">
                {isEnglish ? "Clear product comparison" : "Dễ so sánh mẫu"}
              </h4>
              <p className="text-text-muted">
                {isEnglish
                  ? "The grid keeps image, rating, and price close together so shortlist decisions are faster."
                  : "Grid giữ hình ảnh, đánh giá và giá gần nhau để chọn shortlist nhanh hơn."}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-center font-heading text-[22px] uppercase leading-none text-brand-strong md:text-[28px]">
            FAQ
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-body-md text-[13px] font-bold text-text-base">
                {isEnglish ? "Can I customize a product before ordering?" : "Tôi có thể tùy chỉnh sản phẩm trước khi đặt không?"}
              </h4>
              <p className="mt-1 text-text-muted">
                {isEnglish
                  ? "Yes. Customizable products can collect text, image, logo, or artwork details depending on the product setup."
                  : "Có. Các sản phẩm hỗ trợ tùy chỉnh có thể nhận nội dung chữ, hình ảnh, logo hoặc artwork tùy theo cấu hình sản phẩm."}
              </p>
            </div>
            <div>
              <h4 className="font-body-md text-[13px] font-bold text-text-base">
                {isEnglish ? "What if I need help choosing a model?" : "Nếu chưa biết chọn mẫu nào thì sao?"}
              </h4>
              <p className="mt-1 text-text-muted">
                {isEnglish
                  ? "Use the category filters first, then contact the team with your event type, quantity, and target budget."
                  : "Hãy lọc theo danh mục trước, sau đó gửi loại sự kiện, số lượng và ngân sách dự kiến để đội ngũ tư vấn mẫu phù hợp."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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
  categoryHandle,
  filters,
  emptyState,
}: ProductListingShellProps) {
  const heroImage = featuredImageSrc ?? products[0]?.thumbnail ?? null;
  const resultLabel =
    locale === "en"
      ? `${totalItems} products`
      : `${totalItems} sản phẩm`;

  return (
    <div className="min-h-screen bg-surface-base text-text-base">
      <main>
        {/*<ListingHero
          breadcrumbs={breadcrumbs}
          eyebrow={eyebrow}
          title={title}
          description={description}
          imageSrc={heroImage}
          imageAlt={featuredImageAlt ?? title}
        />
        <ListingTrustBar />
        <ListingFilterSummary
          filters={filters}
          resultLabel={resultLabel}
          locale={locale}
        />*/}
        <ListingResults
          products={products}
          locale={locale}
          categoryHandle={categoryHandle}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          emptyState={emptyState}
        />

        <ListingEditorial title={title} locale={locale} />
      </main>
    </div>
  );
}
