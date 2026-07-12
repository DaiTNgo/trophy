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
    <div className="group flex flex-col items-center text-center">
      <Link to={`/product/${displayHandle}`} className="w-full relative aspect-[4/5] sm:aspect-square mb-6 flex items-center justify-center p-4">
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
        <Link to={`/product/${displayHandle}`} className="mb-2 w-full px-2">
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
