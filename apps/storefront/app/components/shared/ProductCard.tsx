import { Link } from "react-router";
import { Image, Headset, Star, StarHalf } from "lucide-react";
import { getGenericProductPath } from "@/lib/storefront-paths";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  handle?: string;
  categoryHandle?: string | null;
  series?: string;
  category?: string;
  categorySummary?: string | null;
  subtitle?: string | null;
  title: string;
  price?: string | number | null;
  priceAmount?: number | null;
  imageSrc?: string;
  thumbnail?: string | null;
  hoverImage?: string | null;
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
  hoverImage,
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

  const fullStars = Math.floor(rating); // rating UI, commented out
  const hasHalfStar = rating % 1 !== 0; // rating UI, commented out
  const productHref = getGenericProductPath(displayHandle);

  if (variant === "listing") {
    return (
      <div className="group flex h-full flex-col rounded-lg p-3 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(36,65,89,0.18)]">
        <Link
          to={productHref}
          className="relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden bg-surface-base px-3"
        >
          {imgSrc ? (
            <CardImages src={imgSrc} hoverImage={hoverImage} alt={imageAlt} className="group-hover:scale-[1.035]" sizes="(min-width: 1024px) 249px, (min-width: 640px) calc((100vw - 64px) / 3), calc((100vw - 48px) / 2)" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-subtle">
              <Image className="h-10 w-10 text-text-muted" />
            </div>
          )}
        </Link>

        <div className="flex w-full flex-1 flex-col items-center text-center px-1">
          <Link to={productHref} className="mb-1 w-full">
            <h3 className="min-h-[24px] max-w-[260px] font-body-md text-[16px] font-semibold leading-[24px] text-text-base transition-colors line-clamp-1 group-hover:line-clamp-none">
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

          <span className="font-body-md text-[16px] font-semibold leading-5 text-brand-accent">
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
    <div className="group flex h-full flex-col rounded-lg p-3 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(36,65,89,0.18)]">
        <Link
          to={productHref}
          className="relative mb-5 flex aspect-square w-full items-center justify-center overflow-hidden bg-surface-base"
        >
          {imgSrc ? (
            <CardImages src={imgSrc} hoverImage={hoverImage} alt={imageAlt} className="group-hover:scale-[1.04]" sizes="(min-width: 1280px) 267px, (min-width: 1024px) calc((100vw - 160px) / 4), (min-width: 768px) calc((100vw - 96px) / 4), calc((100vw - 48px) / 2)" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
              <Image className="h-10 w-10 text-on-surface-variant" />
            </div>
          )}
        </Link>

        <div className="flex w-full flex-1 flex-col items-center text-center px-1">
          <Link to={productHref} className="mb-1 w-full">
            <h3 className="min-h-[24px] font-body-md text-[16px] font-semibold leading-[24px] text-text-base transition-colors line-clamp-1 hover:line-clamp-none">
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

          <span className="font-body-md text-[16px] font-semibold leading-6 text-brand-accent">
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
      <Link to={productHref} className="relative w-full aspect-[4/5] sm:aspect-square mb-6 flex items-center justify-center overflow-hidden p-4">
        {imgSrc ? (
          <CardImages src={imgSrc} hoverImage={hoverImage} alt={imageAlt} className="" />
        ) : (
          <div className="absolute inset-0 bg-surface-container-low flex items-center justify-center">
            <Image className="text-4xl text-on-surface-variant" />
          </div>
        )}
      </Link>

      <div className="flex flex-col items-center flex-grow">
        <Link to={productHref} className="mb-1 w-full px-2">
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

function CardImages({ src, hoverImage, alt, className, sizes }: { src: string; hoverImage?: string | null; alt: string; className: string; sizes?: string }) {
  return <>
    <img className={`absolute inset-0 h-full w-full object-contain transition-transform duration-500 ${className}`} data-alt={alt} src={src} alt={alt} loading="lazy" sizes={sizes} />
    {hoverImage ? <img className="product-card-hover-image absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-200 motion-reduce:transition-none" src={hoverImage} alt="" aria-hidden="true" loading="lazy" sizes={sizes} /> : null}
  </>;
}
