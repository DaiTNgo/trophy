import { useState, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
}: {
  mainContent: ReactNode;
  customizable?: boolean;
  thumbnails: ProductGalleryThumbnail[];
}) {
  return (
    <section className="lg:sticky lg:top-4 lg:self-start">
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
        <div className="bg-surface-panel">
          {mainContent}
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
    <div className={`relative border-t border-border-subtle bg-white px-2 py-2 ${className}`}>
      {canScrollLeft ? (
        <button
          type="button"
          aria-label="Scroll thumbnails left"
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition hover:border-border-strong"
        >
          <ChevronLeft className="size-4 text-text-muted" />
        </button>
      ) : null}

      <div
        ref={stripRef}
        onScroll={updateScrollState}
        className="flex gap-2 overflow-x-auto scroll-smooth px-6 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {thumbnails.map((thumbnail) => (
          <button
            key={thumbnail.id}
            type="button"
            onClick={thumbnail.onClick}
            className={`shrink-0 overflow-hidden rounded border bg-white transition ${
              thumbnail.active
                ? "border-text-base ring-2 ring-text-base/20"
                : "border-border-subtle hover:border-text-muted"
            }`}
            style={{ width: 68, height: 68 }}
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
          aria-label="Scroll thumbnails right"
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm transition hover:border-border-strong"
        >
          <ChevronRight className="size-4 text-text-muted" />
        </button>
      ) : null}
    </div>
  );
}
