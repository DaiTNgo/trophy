import type { ReactNode } from "react";

export function ProductGallery({
  mainContent,
  thumbnails,
}: {
  mainContent: ReactNode;
  thumbnails: Array<{
    id: string;
    src: string;
    alt: string;
    active: boolean;
    onClick: () => void;
  }>;
}) {
  return (
    <div className="lg:col-span-7">
      <div className="space-y-4">
        <div className="col-span-2 rounded-lg bg-surface-container-low overflow-hidden">
          {mainContent}
        </div>
        {thumbnails.length > 1 ? (
          <div className="grid grid-cols-4 gap-3">
            {thumbnails.map((thumbnail) => (
              <button
                key={thumbnail.id}
                type="button"
                onClick={thumbnail.onClick}
                className={`aspect-square overflow-hidden rounded-lg border transition ${
                  thumbnail.active ? "border-primary" : "border-outline hover:border-primary"
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
    </div>
  );
}
