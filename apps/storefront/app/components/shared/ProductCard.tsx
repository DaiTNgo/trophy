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
  variant?: "default" | "featured" | "listing";
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
  variant = "default",
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
  const productHref = `/product/${displayHandle}`;

  if (variant === "listing") {
    return (
      <div className="group flex h-full flex-col items-center text-center">
        <Link
          to={productHref}
          className="mb-4 flex aspect-square w-full items-center justify-center bg-surface-base px-3"
        >
          {imgSrc ? (
            <img
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.035]"
              data-alt={imageAlt}
              src={imgSrc}
              alt={imageAlt}
              loading="lazy"
              sizes="(min-width: 1280px) 300px, (min-width: 768px) calc((100vw - 160px) / 3), calc((100vw - 48px) / 2)"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-subtle">
              <Image className="h-10 w-10 text-text-muted" />
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col items-center px-1">
          <Link to={productHref} className="mb-2 w-full">
            <h3 className="mx-auto min-h-[38px] max-w-[260px] font-body-md text-[12px] font-bold leading-[19px] text-text-base transition-colors line-clamp-2 group-hover:text-brand-support md:text-[13px]">
              {title}
            </h3>
          </Link>

          {(rating > 0 || reviewsCount > 0) && (
            <div className="mb-2 flex items-center justify-center gap-1.5">
              <div className="flex text-indicator-rating">
                {Array.from({ length: fullStars }).map((_, i) => (
                  <Star key={`full-${i}`} className="h-3.5 w-3.5" fill="currentColor" />
                ))}
                {hasHalfStar && <StarHalf className="h-3.5 w-3.5" fill="currentColor" />}
              </div>
              {reviewsCount > 0 && (
                <span className="text-[10px] leading-none text-text-muted">({reviewsCount})</span>
              )}
            </div>
          )}

          <span className="font-body-md text-[12px] font-bold leading-5 text-text-base">
            {isContactPrice ? (
              <span className="text-action-support">
                <Headset className="inline h-3.5 w-3.5 align-text-bottom" /> Liên Hệ
              </span>
            ) : (
              <>{priceFrom ? "Từ " : ""}{displayPrice}</>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className="flex h-full flex-col items-center text-center">
        <Link
          to={productHref}
          className="relative mb-5 flex aspect-square w-full items-center justify-center overflow-hidden bg-surface-base"
        >
          {imgSrc ? (
            <img
              className="h-full w-full object-contain transition-transform duration-500 hover:scale-[1.04]"
              data-alt={imageAlt}
              src={imgSrc}
              alt={imageAlt}
              loading="lazy"
              sizes="(min-width: 1280px) 267px, (min-width: 1024px) calc((100vw - 160px) / 4), (min-width: 768px) calc((100vw - 96px) / 4), calc((100vw - 48px) / 2)"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-container-low">
              <Image className="h-10 w-10 text-on-surface-variant" />
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col items-center px-1">
          <Link to={productHref} className="mb-3 w-full">
            <h3 className="min-h-[44px] font-body-md text-[15px] font-bold leading-[22px] text-text-base transition-colors line-clamp-2 hover:text-action-support">
              {title}
            </h3>
          </Link>

          {(rating > 0 || reviewsCount > 0) && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="flex text-indicator-rating">
                {Array.from({ length: fullStars }).map((_, i) => (
                  <Star key={`full-${i}`} className="h-4 w-4" fill="currentColor" />
                ))}
                {hasHalfStar && <StarHalf className="h-4 w-4" fill="currentColor" />}
              </div>
              {reviewsCount > 0 && (
                <span className="text-xs text-text-muted">({reviewsCount})</span>
              )}
            </div>
          )}

          <span className="font-body-md text-[16px] font-bold leading-6 text-text-base">
            {isContactPrice ? (
              <span className="text-action-support">
                <Headset className="inline h-4 w-4 align-text-bottom" /> Liên Hệ
              </span>
            ) : (
              <>{priceFrom ? "Từ " : ""}{displayPrice}</>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-center text-center">
      <Link to={productHref} className="w-full relative aspect-[4/5] sm:aspect-square mb-6 flex items-center justify-center p-4">
        {imgSrc ? (
          <img
            className="w-full h-full object-contain transition-transform duration-500"
            data-alt={imageAlt}
            src={imgSrc}
            alt={imageAlt}
          />
        ) : (
          <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
            <Image className="text-4xl text-on-surface-variant" />
          </div>
        )}
      </Link>

      <div className="flex flex-col items-center flex-grow">
        <Link to={productHref} className="mb-2 w-full px-2">
          <h3 className="font-bold text-on-surface text-sm sm:text-base hover:text-primary transition-colors line-clamp-2">{title}</h3>
        </Link>

        {(rating > 0 || reviewsCount > 0) && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex text-[#FFC107]">
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

        <span className="font-bold text-on-surface mt-auto">
          {isContactPrice ? (
            <span className="text-primary">
              <Headset className="!text-[14px] inline align-text-bottom" /> Liên Hệ
            </span>
          ) : (
            <>{priceFrom ? "Từ " : ""}{displayPrice}</>
          )}
          </span>
      </div>
    </div>
  );
}
