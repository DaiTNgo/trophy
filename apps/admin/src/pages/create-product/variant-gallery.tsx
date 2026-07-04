import { Heading, IconButton, Text } from "@medusajs/ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import type { useCreateProduct } from "./use-create-product";
import { AdminMedia } from "../../components/ui/admin-media";

type VariantGalleryProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function VariantGallery({ state }: VariantGalleryProps) {
  const {
    variantGallery,
    closeVariantGallery,
    showPreviousGalleryAsset,
    showNextGalleryAsset,
    setVariantGallery,
  } = state;

  useEffect(() => {
    if (!variantGallery) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeVariantGallery();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [variantGallery, closeVariantGallery]);

  if (!variantGallery) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeVariantGallery();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-elevation-modal">
        <div className="flex items-center justify-between border-b border-ui-border-base px-5 py-4">
          <div className="min-w-0">
            <Heading level="h2">{variantGallery.title}</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              {variantGallery.activeIndex + 1} / {variantGallery.assets.length}
            </Text>
          </div>
          <IconButton type="button" onClick={closeVariantGallery}>
            <X />
          </IconButton>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative flex min-h-[420px] items-center justify-center bg-ui-bg-subtle p-6">
            <AdminMedia
              src={variantGallery.assets[variantGallery.activeIndex]?.contentUrl}
              mimeType={variantGallery.assets[variantGallery.activeIndex]?.mimeType}
              alt={variantGallery.assets[variantGallery.activeIndex]?.fileName}
              className="max-h-[68vh] w-auto max-w-full object-contain"
            />

            {variantGallery.assets.length > 1 ? (
              <>
                <IconButton
                  type="button"
                  variant="transparent"
                  onClick={showPreviousGalleryAsset}
                  className="absolute left-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  type="button"
                  variant="transparent"
                  onClick={showNextGalleryAsset}
                  className="absolute right-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                >
                  <ChevronRight />
                </IconButton>
              </>
            ) : null}
          </div>

          <div className="border-t border-ui-border-base bg-ui-bg-base p-4 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
              {variantGallery.assets.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    setVariantGallery((current) =>
                      current ? { ...current, activeIndex: index } : current
                    )
                  }
                  className={[
                    "overflow-hidden border",
                    index === variantGallery.activeIndex
                      ? "border-ui-border-interactive"
                      : "border-ui-border-base",
                  ].join(" ")}
                >
                  <AdminMedia
                    src={asset.contentUrl}
                    mimeType={asset.mimeType}
                    alt={asset.fileName}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
