import { useRef, useState } from "react";
import {
  Button,
  FocusModal,
  Heading,
  IconButton,
  Text,
  toast,
} from "@medusajs/ui";
import { ImagePlus, Trash } from "lucide-react";
import type { CatalogProduct, ProductVariant } from "../../types";
import {
  type ManagedVariantMedia,
  removeManagedVariantMedia,
  replaceVariantCustomizationBackground,
  uploadManagedVariantMedia,
} from "../../lib/products-client";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import { MediaPreview } from "../../components/ui/media-preview";

type Props = {
  product: CatalogProduct;
  variant: ProductVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateProduct: (updater: (current: CatalogProduct) => CatalogProduct) => void;
};

async function readDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = reject;
        image.src = url;
      },
    );
    return dimensions;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function VariantMediaManager({
  product,
  variant,
  open,
  onOpenChange,
  updateProduct,
}: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  async function run(
    action: string,
    command: () => Promise<ManagedVariantMedia>,
  ) {
    setPending(action);
    try {
      const updated = await command();
      updateProduct((current) => ({
        ...current,
        variants: current.variants.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                media: updated.media,
                customizationMedia: updated.customizationMedia,
              }
            : item,
        ),
      }));
    } catch (error) {
      toast.error("Variant Media could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPending(null);
    }
  }
  async function replaceBackground(file: File) {
    const fileToUpload =
      file.type === "application/pdf"
        ? await convertPdfToImageFile(file)
        : file;
    const sibling = product.variants.find(
      (item) => item.id !== variant.id && item.customizationMedia,
    )?.customizationMedia;
    if (sibling) {
      const dimensions = await readDimensions(fileToUpload).catch(() => null);
      if (
        !dimensions ||
        dimensions.width !== sibling.widthPx ||
        dimensions.height !== sibling.heightPx
      ) {
        toast.error("Customization Background has the wrong size", {
          description: `Use ${sibling.widthPx} x ${sibling.heightPx} px.`,
        });
        return;
      }
    }
    await run("background", () =>
      replaceVariantCustomizationBackground(
        product.id,
        Number(variant.id),
        fileToUpload,
      ),
    );
  }

  async function uploadGallery(files: File[]) {
    const filesToUpload = await Promise.all(
      files.map((file) =>
        file.type === "application/pdf" ? convertPdfToImageFile(file) : file,
      ),
    );
    return uploadManagedVariantMedia(
      product.id,
      Number(variant.id),
      filesToUpload,
    );
  }
  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading level="h2">Manage media</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-8">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Heading level="h3" className="text-base">
                    Gallery Media
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Uploads and removals are saved immediately.
                  </Text>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => galleryInputRef.current?.click()}
                  isLoading={pending === "gallery"}
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload
                </Button>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  if (files.length)
                    void run("gallery", () => uploadGallery(files));
                }}
              />
              {variant.media.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  No Gallery Media.
                </Text>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {variant.media.map((media) => (
                    <article
                      key={media.id}
                      className="overflow-hidden border border-ui-border-base"
                    >
                      <MediaPreview
                        src={media.contentUrl}
                        mimeType={media.mimeType}
                        alt={media.fileName}
                        className="h-36 w-full bg-ui-bg-subtle object-contain"
                      />
                      <div className="flex items-center justify-between gap-2 p-3">
                        <Text size="small" className="truncate">
                          {media.fileName}
                        </Text>
                        <IconButton
                          variant="transparent"
                          onClick={() =>
                            void run(`delete-${media.id}`, () =>
                              removeManagedVariantMedia(
                                product.id,
                                Number(variant.id),
                                media.id,
                              ),
                            )
                          }
                          disabled={pending !== null}
                        >
                          <Trash className="h-4 w-4 text-ui-fg-error" />
                        </IconButton>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            {product.customization?.enabled ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Heading level="h3" className="text-base">
                      Customization Background
                    </Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Replace only. The image size must match other variant
                      backgrounds.
                    </Text>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => backgroundInputRef.current?.click()}
                    isLoading={pending === "background"}
                  >
                    Replace
                  </Button>
                </div>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void replaceBackground(file);
                  }}
                />
                {variant.customizationMedia ? (
                  <MediaPreview
                    src={variant.customizationMedia.contentUrl}
                    mimeType={variant.customizationMedia.mimeType}
                    alt={variant.customizationMedia.fileName}
                    className="h-48 w-full border border-ui-border-base bg-ui-bg-subtle object-contain"
                  />
                ) : (
                  <Text size="small" className="text-ui-fg-subtle">
                    No Customization Background.
                  </Text>
                )}
              </section>
            ) : null}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}
