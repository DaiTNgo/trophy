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
  { icon: "proof", label: "Duyệt mẫu trước khi sản xuất" },
  { icon: "quality", label: "Chất lượng gia công ổn định" },
  { icon: "shipping", label: "Giao hàng toàn quốc" },
  { icon: "guarantee", label: "Tư vấn chọn mẫu đúng nhu cầu" },
];

function TrustIcon({ icon }: { icon: TrustItem["icon"] }) {
  switch (icon) {
    case "shipping":
      return <Truck className="h-4 w-4" />;
    case "quality":
      return <BadgeCheck className="h-4 w-4" />;
    case "guarantee":
      return <ShieldCheck className="h-4 w-4" />;
    default:
      return <ClipboardCheck className="h-4 w-4" />;
  }
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
        <section className="bg-[linear-gradient(112deg,#0f2535_0%,#142d3f_54%,#254760_100%)] text-white">
          <div className="mx-auto grid w-full max-w-[1180px] gap-7 px-5 py-8 md:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] md:px-8 md:py-10 lg:min-h-[260px] lg:items-center">
            <div>
              <nav className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                {breadcrumbs.map((item, index) => (
                  <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
                    {item.href ? (
                      <Link to={item.href} className="transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-white">{item.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
                  </span>
                ))}
              </nav>

              <p className="mb-2 font-body-md text-[11px] font-bold uppercase tracking-[0.2em] text-brand-accent">
                {eyebrow}
              </p>
              <h1 className="max-w-[580px] font-heading text-[42px] uppercase leading-[0.9] md:text-[60px] lg:text-[72px]">
                {title}
              </h1>
              <p className="mt-4 max-w-[610px] font-body-md text-[14px] font-semibold leading-6 text-white/86 md:text-[15px]">
                {description}
              </p>
            </div>

            <div className="relative min-h-[210px] overflow-hidden border-l border-white/18 bg-[radial-gradient(circle_at_48%_40%,rgba(255,255,255,0.22),rgba(255,255,255,0)_56%)] px-6 py-4">
              <div className="absolute bottom-0 left-8 right-8 h-8 border-t border-white/18 bg-black/15" />
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={featuredImageAlt ?? title}
                  className="relative z-10 mx-auto h-[210px] w-full object-contain md:h-[240px]"
                />
              ) : (
                <div className="relative z-10 flex h-[210px] w-full items-center justify-center text-white/45">
                  <Package className="h-14 w-14" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-brand-strong text-white">
          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 divide-x divide-white/12 px-5 md:grid-cols-4 md:px-8">
            {trustItems.map((item) => (
              <div key={item.label} className="flex min-h-12 items-center justify-center gap-2 px-3 py-3 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-white">
                  <TrustIcon icon={item.icon} />
                </span>
                <span className="font-body-md text-[10px] font-bold uppercase tracking-[0.09em] text-white/88 md:text-[11px]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-border-subtle bg-surface-base py-4">
          <div className="mx-auto w-full max-w-[1180px] px-4">
            <div className="mb-3 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-border-subtle" />
              <p className="font-heading text-[18px] uppercase leading-none text-brand-strong">
                {filters ? (locale === "en" ? "Filter by product" : "Lọc theo sản phẩm") : (locale === "en" ? "Collection" : "Bộ sưu tập")}
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

        <section className="bg-surface-base px-4 py-8 md:px-8 md:py-10">
          <div className="mx-auto w-full max-w-[1040px]">
            {products.length === 0 ? (
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
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-5 gap-y-11 md:grid-cols-3 md:gap-x-10 md:gap-y-14">
                  {products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      title={getLocalized(product.title, locale)}
                      subtitle={getLocalized(product.subtitle, locale) || null}
                      categorySummary={getLocalized(product.categorySummary, locale) || null}
                      imageAlt={getLocalized(product.title, locale)}
                      rating={5}
                      reviewsCount={[0, 9, 12, 17, 21, 0, 8, 14][index % 8]}
                      variant="listing"
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
          </div>
        </section>

        <ListingEditorial title={title} locale={locale} />
      </main>
    </div>
  );
}
