import { useState, useRef, useMemo, useEffect } from "react";
import { Button, Container, Heading, Text, clx, IconButton, FocusModal, Checkbox } from "@medusajs/ui";
import { Upload, MoreHorizontal, Image, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CatalogProduct } from "../../types";
import { updateProductMedia } from "../../lib/products-client";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { AdminMedia } from "../../components/ui/admin-media";
import { InlineError } from "../../components/ui/medusa/inline-error";
import { convertPdfToImageFile } from "../../lib/pdf-preview";

const MAX_THUMBNAIL_COUNT = 10;

type ThumbnailItem = {
  url: string;
  mimeType?: string;
  isUploading?: boolean;
  file?: File;
};

function ThumbnailGallery({ 
  thumbnails, 
  onClose 
}: { 
  thumbnails: ThumbnailItem[]; 
  onClose: () => void 
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft") {
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setActiveIndex(prev => Math.min(thumbnails.length - 1, prev + 1));
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [thumbnails.length, onClose]);

  if (thumbnails.length === 0) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-elevation-modal">
        <div className="flex items-center justify-between border-b border-ui-border-base px-5 py-4">
          <div className="min-w-0">
            <Heading level="h2">Product Media</Heading>
            <Text size="small" className="mt-1 text-ui-fg-subtle">
              {activeIndex + 1} / {thumbnails.length}
            </Text>
          </div>
          <IconButton type="button" onClick={onClose} variant="transparent">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative flex min-h-[420px] items-center justify-center bg-ui-bg-subtle p-6">
            <AdminMedia
              src={thumbnails[activeIndex]?.url}
              mimeType={thumbnails[activeIndex]?.mimeType}
              alt={`Media ${activeIndex + 1}`}
              className="max-h-[68vh] w-auto max-w-full object-contain"
            />

            {thumbnails.length > 1 ? (
              <>
                {activeIndex > 0 && (
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => setActiveIndex(prev => prev - 1)}
                    className="absolute left-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                  >
                    <ChevronLeft />
                  </IconButton>
                )}
                {activeIndex < thumbnails.length - 1 && (
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => setActiveIndex(prev => prev + 1)}
                    className="absolute right-4 bg-ui-bg-base shadow-elevation-card-rest hover:bg-ui-bg-base-hover"
                  >
                    <ChevronRight />
                  </IconButton>
                )}
              </>
            ) : null}
          </div>

          <div className="border-t border-ui-border-base bg-ui-bg-base p-4 lg:border-l lg:border-t-0 overflow-y-auto max-h-[68vh]">
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-2">
              {thumbnails.map((asset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={[
                    "overflow-hidden border rounded-lg",
                    index === activeIndex
                      ? "border-ui-border-interactive ring-2 ring-ui-border-interactive"
                      : "border-ui-border-base opacity-70 hover:opacity-100",
                  ].join(" ")}
                >
                  <AdminMedia
                    src={asset.url}
                    mimeType={asset.mimeType}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-20 w-full object-contain"
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

type ProductDetailThumbnailProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

export function ProductDetailThumbnail({ product, mutate }: ProductDetailThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productMedia = product.media ?? [];

  // Cleanup object URLs when they are removed from thumbnails or drawer is closed
  useEffect(() => {
    return () => {
      thumbnails.forEach(t => {
        if (t.file && t.url.startsWith("blob:")) {
          URL.revokeObjectURL(t.url);
        }
      });
    };
  }, [thumbnails]);

  // Extract all unique media from all variants
  const allVariantMedia = useMemo(() => {
    const map = new Map<string, { url: string; mimeType: string }>();
    product.variants?.forEach((v) => {
      v.media?.forEach((m) => {
        if (!map.has(m.contentUrl)) {
          map.set(m.contentUrl, { url: m.contentUrl, mimeType: m.mimeType });
        }
      });
    });
    return Array.from(map.values());
  }, [product.variants]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Map current product media URLs to items
      setThumbnails(
        productMedia.slice(0, MAX_THUMBNAIL_COUNT).map((url) => {
          const variantMedia = allVariantMedia.find((vm) => vm.url === url);
          return {
            url,
            mimeType: variantMedia?.mimeType || (url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          };
        })
      );
      setError(null);
    } else {
      // Cleanup Object URLs on close
      thumbnails.forEach(t => {
        if (t.file && t.url.startsWith("blob:")) {
          URL.revokeObjectURL(t.url);
        }
      });
      setSelectedIndexes([]);
    }
    setOpen(isOpen);
  };

  const isUploading = thumbnails.some((t) => t.isUploading);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (thumbnails.length >= MAX_THUMBNAIL_COUNT) return;

    setError(null);

    try {
      let fileToProcess = file;
      if (file.type === "application/pdf") {
        fileToProcess = await convertPdfToImageFile(file);
      }

      const objectUrl = URL.createObjectURL(fileToProcess);

      setThumbnails((prev) => [
        ...prev,
        {
          url: objectUrl,
          mimeType: fileToProcess.type,
          isUploading: false,
          file: fileToProcess,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file preview");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const deleteSelected = () => {
    setThumbnails(prev => {
      const next = [...prev];
      selectedIndexes.sort((a, b) => b - a).forEach(idx => {
        const removed = next[idx];
        if (removed?.file && removed.url.startsWith("blob:")) {
          URL.revokeObjectURL(removed.url);
        }
        next.splice(idx, 1);
      });
      return next;
    });
    setSelectedIndexes([]);
    if (selectedIndexes.includes(thumbnailIndex)) {
      setThumbnailIndex(0);
    } else {
      // Adjust thumbnail index if items before it were deleted
      const deletedBefore = selectedIndexes.filter(i => i < thumbnailIndex).length;
      setThumbnailIndex(prev => Math.max(0, prev - deletedBefore));
    }
  };

  const makeThumbnail = () => {
    if (selectedIndexes.length === 1) {
      setThumbnailIndex(selectedIndexes[0]);
      setSelectedIndexes([]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Step 1: Upload any pending files
      const uploadPromises = thumbnails.map(async (t) => {
        if (!t.file) return { url: t.url };
        
        // Mark as uploading for UI feedback if needed, though we block the whole UI anyway
        const media = await uploadProductVariantMedia(t.file);
        return { url: media.contentUrl };
      });

      const items = await Promise.all(uploadPromises);

      // Reorder items so thumbnailIndex is first, if applicable
      let finalItems = items;
      if (thumbnailIndex > 0 && thumbnailIndex < items.length) {
        finalItems = [
          items[thumbnailIndex],
          ...items.slice(0, thumbnailIndex),
          ...items.slice(thumbnailIndex + 1)
        ];
      }

      // Step 2: Save updated media URLs to product
      await updateProductMedia(product.id, finalItems);
      await mutate();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save thumbnails");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">Media</Heading>

          <FocusModal open={open} onOpenChange={handleOpen}>
            <FocusModal.Trigger asChild>
              <IconButton variant="transparent" size="small">
                <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
              </IconButton>
            </FocusModal.Trigger>

            <FocusModal.Content>
              <FocusModal.Header>
                <div className="flex w-full items-center justify-end">
                  <Button variant="secondary" size="small" onClick={() => setGalleryOpen(true)}>Gallery</Button>
                </div>
              </FocusModal.Header>

              <FocusModal.Body className="flex flex-col flex-1 overflow-hidden relative">
                <div className="flex flex-1 overflow-hidden">
                  {/* Left Column - Gallery */}
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                    {error && <InlineError message={error} />}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {thumbnails.map((thumb, index) => {
                        const isSelected = selectedIndexes.includes(index);
                        const isThumbnail = index === thumbnailIndex;
                        
                        return (
                          <div
                            key={index}
                            className={clx(
                              "relative overflow-hidden rounded-xl border bg-ui-bg-subtle transition-all cursor-pointer group",
                              isSelected ? "border-ui-border-interactive ring-1 ring-ui-border-interactive" : "border-ui-border-base hover:border-ui-border-strong",
                              thumb.isUploading && "opacity-50"
                            )}
                            style={{ aspectRatio: "1 / 1" }}
                            onClick={() => toggleSelection(index)}
                          >
                            <AdminMedia
                              src={thumb.url}
                              mimeType={thumb.mimeType}
                              className="h-full w-full object-contain p-2"
                              alt={`Media ${index + 1}`}
                            />
                            
                            <div className={clx(
                              "absolute top-2 right-2 transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                              <Checkbox checked={isSelected} />
                            </div>
                            
                            {isThumbnail && (
                              <div className="absolute top-2 left-2 h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center">
                                <Image className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column - Upload */}
                  <div className="w-[400px] border-l border-ui-border-base p-6 overflow-y-auto flex flex-col bg-ui-bg-base">
                    <div className="flex flex-col gap-y-1 mb-4">
                      <Heading level="h2" className="text-lg font-semibold">
                        Media <span className="text-ui-fg-muted font-normal text-sm">(Optional)</span>
                      </Heading>
                      <Text size="small" className="text-ui-fg-subtle">
                        Add media to the product to showcase it in your storefront.
                      </Text>
                    </div>

                    <div 
                      className="mt-2 flex flex-col items-center justify-center gap-y-2 rounded-xl border border-dashed border-ui-border-base py-12 px-6 transition hover:border-ui-border-strong hover:bg-ui-bg-subtle cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-ui-fg-subtle mb-1" />
                      <Text size="small" className="text-ui-fg-base font-medium">Upload images</Text>
                      <Text size="small" className="text-ui-fg-subtle text-center">
                        Drag and drop images here or click to upload.
                      </Text>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleFileSelect(e)}
                    />
                  </div>
                </div>

                {/* Floating Action Bar */}
                {selectedIndexes.length > 0 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-[#1a1a1a] text-white rounded-full px-5 py-2.5 gap-x-4 shadow-elevation-flyout animate-in slide-in-from-bottom-4">
                    <Text size="small" className="font-medium">{selectedIndexes.length} selected</Text>
                    
                    {selectedIndexes.length === 1 && (
                      <>
                        <div className="w-px h-4 bg-gray-700" />
                        <button 
                          className="text-sm font-medium flex items-center gap-x-2 text-gray-200 hover:text-white transition-colors"
                          onClick={makeThumbnail}
                        >
                          Make thumbnail <span className="flex items-center justify-center rounded border border-gray-600 bg-gray-800 w-5 h-5 text-[10px] text-gray-300">T</span>
                        </button>
                      </>
                    )}
                    
                    <div className="w-px h-4 bg-gray-700" />
                    <button 
                      className="text-sm font-medium flex items-center gap-x-2 text-gray-200 hover:text-red-400 transition-colors"
                      onClick={deleteSelected}
                    >
                      Delete <span className="flex items-center justify-center rounded border border-gray-600 bg-gray-800 w-5 h-5 text-[10px] text-gray-300">D</span>
                    </button>
                  </div>
                )}

                {/* Bottom Right Actions */}
                <div className="absolute bottom-6 right-6 flex items-center gap-x-2">
                  <FocusModal.Close asChild>
                    <Button variant="secondary" disabled={isSubmitting || isUploading}>
                      Cancel
                    </Button>
                  </FocusModal.Close>
                  <Button
                    onClick={() => void handleSave()}
                    isLoading={isSubmitting}
                    disabled={isUploading}
                  >
                    Save
                  </Button>
                </div>

                {/* Gallery Overlay */}
                {galleryOpen && (
                  <ThumbnailGallery 
                    thumbnails={thumbnails} 
                    onClose={() => setGalleryOpen(false)} 
                  />
                )}
              </FocusModal.Body>
            </FocusModal.Content>
          </FocusModal>
        </div>

        {/* Read-only display */}
        <div className="border-t border-ui-border-base px-6 py-4">
          {productMedia.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {productMedia.slice(0, MAX_THUMBNAIL_COUNT).map((url, idx) => {
                const variantMedia = allVariantMedia.find((vm) => vm.url === url);
                const mimeType = variantMedia?.mimeType || (url.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <AdminMedia
                      src={url}
                      mimeType={mimeType}
                      className="h-full w-full object-contain"
                      alt={`Thumbnail ${idx + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Text size="base" weight="plus" className="mb-1">No media yet</Text>
              <Text size="small" className="text-ui-fg-subtle mb-4">
                Add media to showcase it in your storefront.
              </Text>
              <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
                Add media
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
