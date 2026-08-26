import { useState, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ProductGalleryThumbnail = {
  id: string;
  src: string;
  alt: string;
  active: boolean;
  onClick: () => void;
};

export function ProductGallery({
  mainContent,
  thumbnails,
  onPrevious,
  onNext,
  customizable = false,
}: {
  mainContent: ReactNode;
  customizable?: boolean;
  thumbnails: ProductGalleryThumbnail[];
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { t } = useTranslation("products");

  return (
    <section className="lg:sticky lg:top-36 lg:self-start">
      <div
        className={`overflow-hidden rounded-lg bg-white ${
          customizable ? "shadow-[inset_0_0_0_1px_rgba(36,65,89,0.16)]" : ""
        }`}
      >
        <div className="relative bg-white">
          {onPrevious && thumbnails.length > 1 ? (
            <button
              type="button"
              aria-label={t("prev_image_aria")}
              onClick={onPrevious}
              className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 shadow-sm transition hover:border-border-strong"
            >
              <ChevronLeft className="size-5 text-text-base" />
            </button>
          ) : null}
          {mainContent}
          {onNext && thumbnails.length > 1 ? (
            <button
              type="button"
              aria-label={t("next_image_aria")}
              onClick={onNext}
              className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white/90 shadow-sm transition hover:border-border-strong"
            >
              <ChevronRight className="size-5 text-text-base" />
            </button>
          ) : null}
        </div>
        <ProductGalleryThumbnails thumbnails={thumbnails} />
      </div>
    </section>
  );
}

export function ProductGalleryThumbnails({
  thumbnails,
  className = "",
}: {
  thumbnails: ProductGalleryThumbnail[];
  className?: string;
}) {
  const { t } = useTranslation("products");
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  function scrollBy(dir: -1 | 1) {
    stripRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  }

  if (thumbnails.length <= 1) return null;

  return (
    <div className={`relative bg-white px-4 py-3 ${className}`}>
      {canScrollLeft ? (
        <button
          type="button"
          aria-label={t("scroll_thumbnails_left")}
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition hover:border-border-strong"
        >
          <ChevronLeft className="size-4 text-text-muted" />
        </button>
      ) : null}

      <div
        ref={stripRef}
        onScroll={updateScrollState}
        className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto scroll-smooth px-1 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {thumbnails.map((thumbnail) => (
          <button
            key={thumbnail.id}
            type="button"
            onClick={thumbnail.onClick}
            aria-current={thumbnail.active ? "true" : undefined}
            className={`shrink-0 overflow-hidden rounded-md border bg-white transition ${
              thumbnail.active
                ? "border-brand-strong ring-2 ring-brand-strong/15"
                : "border-border-subtle hover:border-text-muted"
            }`}
            style={{ width: 72, height: 72 }}
          >
            <img
              src={thumbnail.src}
              alt={thumbnail.alt}
              className="h-full w-full object-contain p-1"
            />
          </button>
        ))}
      </div>

      {canScrollRight && thumbnails.length > 5 ? (
        <button
          type="button"
          aria-label={t("scroll_thumbnails_right")}
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition hover:border-border-strong"
        >
          <ChevronRight className="size-4 text-text-muted" />
        </button>
      ) : null}
    </div>
  );
}
