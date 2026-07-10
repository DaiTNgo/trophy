import type { ReactNode } from "react";
import { CheckCircle2, Image, Layers3 } from "lucide-react";

export function ProductGallery({
  mainContent,
  thumbnails,
  customizable = false,
}: {
  mainContent: ReactNode;
  customizable?: boolean;
  thumbnails: Array<{
    id: string;
    src: string;
    alt: string;
    active: boolean;
    onClick: () => void;
  }>;
}) {
  return (
    <section className="lg:sticky lg:top-8 lg:self-start">
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-white shadow-[0_18px_70px_rgba(28,27,27,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-fixed text-primary">
              <Layers3 className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface">Personalization studio</p>
              <p className="text-xs text-on-surface-variant">Variant image + customization preview</p>
            </div>
          </div>
          {customizable ? (
            <span className="inline-flex h-8 items-center gap-2 rounded-md border border-primary/20 bg-primary-fixed px-3 text-xs font-bold uppercase tracking-[0.08em] text-on-primary-fixed">
              <CheckCircle2 className="size-3.5" />
              Print-ready
            </span>
          ) : (
            <span className="inline-flex h-8 items-center gap-2 rounded-md border border-outline bg-surface-container-low px-3 text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">
              <Image className="size-3.5" />
              Product image
            </span>
          )}
        </div>
        <div className="bg-[#f5f2ec]">
          {mainContent}
        </div>
        {thumbnails.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 border-t border-outline-variant bg-white p-3 sm:grid-cols-5">
            {thumbnails.map((thumbnail) => (
              <button
                key={thumbnail.id}
                type="button"
                onClick={thumbnail.onClick}
                className={`aspect-square overflow-hidden rounded-md border bg-white p-1 transition ${
                  thumbnail.active ? "border-primary ring-2 ring-primary/20" : "border-outline hover:border-primary"
                }`}
              >
                <img
                  src={thumbnail.src}
                  alt={thumbnail.alt}
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
