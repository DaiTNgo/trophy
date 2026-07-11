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
      <div className="overflow-hidden rounded-[14px] border border-[#d8c1ad] bg-white">
        <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#d8c1ad] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f4eee8] text-[#110023]">
              <Layers3 className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#2d4056]">Personalization studio</p>
              <p className="text-sm text-[#7b6b5f]">Variant image + customization preview</p>
            </div>
          </div>
          {customizable ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8c1ad] bg-[#fbf8f5] px-3 text-xs font-bold uppercase tracking-[0.1em] text-[#2d4056]">
              <CheckCircle2 className="size-3.5" />
              Print-ready
            </span>
          ) : (
            <span className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8c1ad] bg-[#fbf8f5] px-3 text-xs font-bold uppercase tracking-[0.1em] text-[#7b6b5f]">
              <Image className="size-3.5" />
              Product image
            </span>
          )}
        </div>
        <div className="bg-[#f5f1eb]">
          {mainContent}
        </div>
        {thumbnails.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 border-t border-[#d8c1ad] bg-white p-3 sm:grid-cols-5">
            {thumbnails.map((thumbnail) => (
              <button
                key={thumbnail.id}
                type="button"
                onClick={thumbnail.onClick}
                className={`aspect-square overflow-hidden rounded-[10px] border bg-white p-1 transition ${
                  thumbnail.active ? "border-[#110023] ring-2 ring-[#110023]/15" : "border-[#d8c1ad] hover:border-[#110023]"
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
