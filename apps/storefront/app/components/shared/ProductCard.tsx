import { Link } from "react-router";
import { Image, Star, StarHalf, Headset } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  handle?: string;
  series?: string;
  category?: string;
  categorySummary?: string | null;
  subtitle?: string | null;
  title: string;
  price?: string | number | null;
  priceAmount?: number | null;
  imageSrc?: string;
  thumbnail?: string | null;
  imageAlt?: string;
  rating?: number;
  reviewsCount?: number;
  priceFrom?: boolean;
}

export function ProductCard({
  handle,
  category,
  categorySummary,
  subtitle,
  title,
  price,
  priceAmount,
  imageSrc,
  thumbnail,
  imageAlt = title,
  rating = 5,
  reviewsCount = 0,
  priceFrom = false,
}: ProductCardProps) {
  const displayHandle = handle || "cup-hop-kim-kl1-premium";
  const displayPrice = priceAmount !== undefined
    ? formatCurrency(priceAmount)
    : typeof price === "string"
      ? price
      : formatCurrency(Number(price) || 0);
  const imgSrc = imageSrc || thumbnail || "";
  const isContactPrice = (priceAmount === undefined ? (typeof price === "string" ? false : price === null) : priceAmount === null);
  const metaLine = categorySummary || category || subtitle;

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="group product-card flex h-full flex-col rounded-sm border border-border-subtle bg-surface-base p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,23,64,0.08)] md:p-4">
      <Link
        to={`/product/${displayHandle}`}
        className="relative mb-4 flex aspect-[1/1.02] w-full items-center justify-center rounded-sm bg-surface-panel p-4"
      >
        {imgSrc ? (
          <img
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            data-alt={imageAlt}
            src={imgSrc}
            alt={imageAlt}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-sm bg-surface-container-low">
            <Image className="text-4xl text-on-surface-variant" />
          </div>
        )}
      </Link>

      <div className="flex flex-grow flex-col items-center">
        {metaLine ? (
          <p className="mb-2 line-clamp-1 min-h-4 font-label-md text-[10px] uppercase tracking-[0.14em] text-brand-support">
            {metaLine}
          </p>
        ) : (
          <div className="mb-2 min-h-4" />
        )}

        <Link to={`/product/${displayHandle}`} className="mb-2 w-full px-1">
          <h3 className="line-clamp-2 min-h-10 text-[14px] font-bold uppercase leading-5 text-brand-strong transition-colors hover:text-action-commerce md:text-[15px]">
            {title}
          </h3>
        </Link>

        {(rating > 0 || reviewsCount > 0) && (
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex text-indicator-rating">
              {Array.from({ length: fullStars }).map((_, i) => (
                <Star key={`full-${i}`} className="!text-[16px]" fill="currentColor" />
              ))}
              {hasHalfStar && <StarHalf className="!text-[16px]" fill="currentColor" />}
            </div>
            {reviewsCount > 0 && (
              <span className="text-xs text-on-surface-variant">({reviewsCount})</span>
            )}
          </div>
        )}

        <div className="mt-auto flex min-h-10 flex-col items-center justify-end">
          {!isContactPrice ? (
            <span className="font-label-md text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
              {priceFrom ? "Giá từ" : "Giá bán"}
            </span>
          ) : null}
          <span
            className={cn(
              "mt-1 font-heading text-[22px] uppercase leading-none",
              isContactPrice ? "text-brand-strong" : "text-indicator-price",
            )}
          >
          {isContactPrice ? (
            <span>
              <Headset className="!text-[14px] inline align-text-bottom" /> Liên Hệ
            </span>
          ) : (
            <>{displayPrice}</>
          )}
          </span>
        </div>
      </div>
    </div>
  );
}
