import { Link } from "react-router";
import { Image, Headset, Star, StarHalf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getProductPath } from "@/lib/storefront-paths";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  handle?: string;
  categoryHandle?: string | null;
  collectionHandle?: string | null;
  sourceContext?: "category" | "collection";
  from?: string | null;
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

const GRID_CARD_STYLES = {
  listing: {
    media: "mb-4 px-3",
    sizes: "(min-width: 1024px) 249px, (min-width: 640px) calc((100vw - 64px) / 3), calc((100vw - 48px) / 2)",
    placeholder: "bg-surface-subtle",
    placeholderIcon: "text-text-muted",
    titleHover: "group-hover:line-clamp-none",
    rating: "mb-2 gap-1.5",
    icon: "h-3.5 w-3.5",
    reviewsCount: "text-[10px] leading-none",
    priceLeading: "leading-5",
  },
  featured: {
    media: "mb-5",
    sizes: "(min-width: 1280px) 267px, (min-width: 1024px) calc((100vw - 160px) / 4), (min-width: 768px) calc((100vw - 96px) / 4), calc((100vw - 48px) / 2)",
    placeholder: "bg-surface-container-low",
    placeholderIcon: "text-on-surface-variant",
    titleHover: "hover:line-clamp-none",
    rating: "mb-3 gap-2",
    icon: "h-4 w-4",
    reviewsCount: "text-xs",
    priceLeading: "leading-6",
  },
};

export function ProductCard({
  handle,
  categoryHandle,
  collectionHandle,
  sourceContext,
  from,
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
  const { t } = useTranslation(["products", "common"]);
  const displayHandle = handle || "cup-hop-kim-kl1-premium";
  const displayPrice = priceAmount !== undefined
    ? formatCurrency(priceAmount)
    : typeof price === "string"
      ? price
      : formatCurrency(Number(price) || 0);
  const imgSrc = imageSrc || thumbnail || "";
  const isContactPrice = (priceAmount === undefined ? (typeof price === "string" ? false : price === null) : priceAmount === null);

  const fullStars = Math.floor(rating); // rating UI, commented out
  const hasHalfStar = rating % 1 !== 0; // rating UI, commented out
  const productHref = getProductPath({
    productHandle: displayHandle,
    categoryHandle,
    collectionHandle,
    sourceContext,
    from,
  });

  if (variant === "listing" || variant === "featured") {
    const style = GRID_CARD_STYLES[variant];
    return (
      <div className="group flex h-full flex-col rounded-lg p-3 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(36,65,89,0.18)]">
        <Link
          to={productHref}
          className={`relative ${style.media} flex aspect-square w-full items-center justify-center overflow-hidden bg-surface-base`}
        >
          {imgSrc ? (
            <CardImages src={imgSrc} hoverImage={hoverImage} alt={imageAlt} className="group-hover:scale-[1.08]" sizes={style.sizes} />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center ${style.placeholder}`}>
              <Image className={`h-10 w-10 ${style.placeholderIcon}`} />
            </div>
          )}
        </Link>

        <div className="flex w-full flex-1 flex-col items-center text-center px-1">
          <Link to={productHref} className="mb-1 flex w-full justify-center text-center">
            <h3 className={`min-h-[24px] max-w-[260px] mx-auto text-center font-body-md text-[16px] font-semibold leading-[24px] text-text-base transition-colors line-clamp-1 ${style.titleHover}`}>
              {title}
            </h3>
          </Link>

          {(rating > 0 || reviewsCount > 0) && (
            <div className={`${style.rating} flex items-center justify-center`}>
              <div className="flex text-indicator-rating">
                {Array.from({ length: fullStars }).map((_, i) => (
                  <Star key={`full-${i}`} className={style.icon} fill="currentColor" />
                ))}
                {hasHalfStar && <StarHalf className={style.icon} fill="currentColor" />}
              </div>
              {reviewsCount > 0 && (
                <span className={`${style.reviewsCount} text-text-muted`}>({reviewsCount})</span>
              )}
            </div>
          )}

          <span className={`font-body-md text-[16px] font-semibold ${style.priceLeading} text-brand-accent`}>
            {isContactPrice ? (
              <span className="text-action-support">
                <Headset className={`inline ${style.icon} align-text-bottom`} /> {t("contact_short", "Liên Hệ")}
              </span>
            ) : (
              <>{priceFrom ? `${t("price_from", "Từ")} ` : ""}{displayPrice}</>
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
        <Link to={productHref} className="mb-1 flex w-full justify-center px-2 text-center">
          <h3 className="mx-auto text-center font-bold text-on-surface text-sm sm:text-base hover:text-primary transition-colors line-clamp-2">{title}</h3>
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
              <Headset className="!text-[14px] inline align-text-bottom" /> {t("contact_short", "Liên Hệ")}
            </span>
          ) : (
            <>{priceFrom ? `${t("price_from", "Từ")} ` : ""}{displayPrice}</>
          )}
        </span>
      </div>
    </div>
  );
}

function CardImages({ src, hoverImage, alt, className, sizes }: { src: string; hoverImage?: string | null; alt: string; className: string; sizes?: string }) {
  return <>
    <img className={`product-card-base-image absolute inset-0 h-full w-full object-contain ${hoverImage ? "product-card-base-image--swap" : ""}`} data-alt={alt} src={src} alt={alt} loading="lazy" sizes={sizes} />
    {hoverImage ? <img className={`product-card-hover-image absolute inset-0 h-full w-full object-contain opacity-0 transition-[opacity,scale] duration-300 motion-reduce:transition-none ${className}`} src={hoverImage} alt="" aria-hidden="true" loading="lazy" sizes={sizes} /> : null}
  </>;
}
