import { useState, useRef } from "react";
import { Button, Container, Heading, Text, Drawer } from "@medusajs/ui";
import { Image, Edit, Upload, X } from "lucide-react";
import type { CatalogProduct } from "../../types";
import { updateProductMedia } from "../../lib/products-client";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { AdminMedia } from "../../components/ui/admin-media";
import { InlineError } from "../../components/ui/medusa/inline-error";

const MAX_THUMBNAIL_COUNT = 2;

type ThumbnailItem = {
  assetId: string;
  url: string;
  mimeType: string;
  isUploading?: boolean;
};

type ProductDetailThumbnailProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailThumbnail({ product, mutate }: ProductDetailThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product-level media stored as URL strings — we don't have assetId after fetching,
  // so the drawer re-initialises with existing URLs displayed as read-only previews
  // that are replaced on new uploads. To keep it simple: open drawer = start fresh
  // but show existing thumbnails as "already uploaded" placeholders without assetId.
  // Users must re-upload to change them.
  const productMedia = product.media ?? [];

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Restore current saved media as read-only display items (no assetId → cannot be
      // re-submitted as-is; user must re-upload to keep or replace them).
      setThumbnails(
        productMedia.slice(0, MAX_THUMBNAIL_COUNT).map((url) => ({
          assetId: "",
          url,
          mimeType: url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        }))
      );
      setError(null);
    }
    setOpen(isOpen);
  };

  const isUploading = thumbnails.some((t) => t.isUploading);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (thumbnails.length >= MAX_THUMBNAIL_COUNT) return;

    // Add a placeholder while uploading
    const placeholderIndex = thumbnails.length;
    setThumbnails((prev) => [
      ...prev,
      { assetId: "", url: "", mimeType: file.type, isUploading: true },
    ]);
    setError(null);

    try {
      const media = await uploadProductVariantMedia(file);
      setThumbnails((prev) => {
        const updated = [...prev];
        updated[placeholderIndex] = {
          assetId: media.id,
          url: media.contentUrl,
          mimeType: media.mimeType,
          isUploading: false,
        };
        return updated;
      });
    } catch (err) {
      setThumbnails((prev) => prev.filter((_, i) => i !== placeholderIndex));
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeThumbnail = (index: number) => {
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Only save items that actually have an assetId (newly uploaded ones).
    // Existing-URL-only items without assetId are dropped.
    const items = thumbnails
      .filter((t) => !t.isUploading && t.assetId)
      .map((t) => ({ assetId: t.assetId }));

    setIsSubmitting(true);
    setError(null);
    try {
      await updateProductMedia(product.id, items);
      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save thumbnails");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <Image className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Thumbnail
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Up to {MAX_THUMBNAIL_COUNT} product-level media files. Shown on listing and detail pages.
            </Text>
          </div>

          <Drawer open={open} onOpenChange={handleOpen}>
            <Drawer.Trigger asChild>
              <Button variant="secondary" size="small">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Drawer.Trigger>

            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Edit Thumbnail</Drawer.Title>
              </Drawer.Header>

              <Drawer.Body className="flex flex-col gap-y-6">
                {error && <InlineError message={error} />}

                <Text size="small" className="text-ui-fg-subtle">
                  Upload up to {MAX_THUMBNAIL_COUNT} images or PDFs. Existing files are shown below;
                  to keep them you must re-upload, or remove them and upload new ones.
                </Text>

                {/* Grid of thumbnails */}
                <div className="grid grid-cols-2 gap-4">
                  {thumbnails.map((thumb, index) => (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle"
                      style={{ aspectRatio: "1 / 1" }}
                    >
                      {thumb.isUploading ? (
                        <div className="flex h-full w-full items-center justify-center animate-pulse">
                          <Text size="xsmall" className="text-ui-fg-muted">Uploading…</Text>
                        </div>
                      ) : (
                        <>
                          <AdminMedia
                            src={thumb.url}
                            mimeType={thumb.mimeType}
                            className="h-full w-full object-cover"
                            alt={`Thumbnail ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeThumbnail(index)}
                            className="absolute right-1 top-1 rounded-full bg-ui-bg-overlay p-1 text-ui-fg-on-color shadow transition hover:bg-ui-bg-overlay-hover"
                            aria-label="Remove thumbnail"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {!thumb.assetId && (
                            <div className="absolute bottom-0 left-0 right-0 bg-ui-bg-overlay px-2 py-1">
                              <Text size="xsmall" className="text-ui-fg-on-color">
                                Re-upload to keep
                              </Text>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Upload slot */}
                  {thumbnails.length < MAX_THUMBNAIL_COUNT && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted transition hover:border-ui-border-strong hover:text-ui-fg-base disabled:opacity-50"
                      style={{ aspectRatio: "1 / 1" }}
                      aria-label="Upload thumbnail"
                    >
                      <Upload className="h-5 w-5" />
                      <Text size="xsmall">Upload</Text>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => void handleFileSelect(e)}
                />
              </Drawer.Body>

              <Drawer.Footer>
                <Drawer.Close asChild>
                  <Button variant="secondary" disabled={isSubmitting || isUploading}>
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button
                  onClick={() => void handleSave()}
                  isLoading={isSubmitting}
                  disabled={isUploading}
                >
                  Save
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer>
        </div>

        {/* Read-only display */}
        <div className="mt-2">
          {productMedia.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {productMedia.slice(0, MAX_THUMBNAIL_COUNT).map((url, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <AdminMedia
                    src={url}
                    mimeType={url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"}
                    className="h-full w-full object-cover"
                    alt={`Thumbnail ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle">
              <Text size="small" className="text-ui-fg-muted">No thumbnails uploaded.</Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
