import { useMemo, useRef, useState } from "react";
import { Button, Container, FocusModal, Heading, IconButton, Text, toast } from "@medusajs/ui";
import { Image, MoreHorizontal, Trash, Upload } from "lucide-react";
import type { CatalogProduct, ProductVariantMedia } from "../../types";
import { removeProductMedia, setProductListingMedia, uploadProductMedia } from "../../lib/products-client";
import { MediaPreview } from "../../components/ui/media-preview";

type Props = { product: CatalogProduct; mutate: () => Promise<void> };
type ListingRole = "none" | "default" | "hover";

function getListingRole(product: CatalogProduct, assetId: string): ListingRole {
  if (product.thumbnailAssetId === assetId) return "default";
  if (product.hoverAssetId === assetId) return "hover";
  return "none";
}

export function ProductDetailThumbnail({ product, mutate }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = useMemo(() => {
    const candidates: ProductVariantMedia[] = [
      ...product.media,
      ...product.variants.flatMap((variant) => [
        ...variant.media,
        ...(variant.customizationMedia ? [variant.customizationMedia] : []),
      ]),
    ];
    return candidates.filter((asset, index, all) => all.findIndex((candidate) => candidate.id === asset.id) === index);
  }, [product.media, product.variants]);
  const defaultImage = assets.find((asset) => asset.id === product.thumbnailAssetId) ?? null;
  const hoverImage = assets.find((asset) => asset.id === product.hoverAssetId) ?? null;

  async function run(command: () => Promise<unknown>) {
    setPending(true);
    try {
      await command();
      await mutate();
    } catch (error) {
      toast.error("Listing Media could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  function assignRole(assetId: string, role: ListingRole) {
    let defaultAssetId = product.thumbnailAssetId ?? null;
    let hoverAssetId = product.hoverAssetId ?? null;

    if (role === "none") {
      if (defaultAssetId === assetId) defaultAssetId = null;
      if (hoverAssetId === assetId) hoverAssetId = null;
    } else if (role === "default") {
      defaultAssetId = assetId;
      if (hoverAssetId === assetId) hoverAssetId = null;
    } else {
      hoverAssetId = assetId;
      if (defaultAssetId === assetId) defaultAssetId = null;
    }

    void run(() => setProductListingMedia(product.id, { defaultAssetId, hoverAssetId }));
  }

  return (
    <Container className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2" className="text-xl font-semibold">Listing media</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">Assign the default and hover images used by storefront product cards.</Text>
        </div>
        <FocusModal open={open} onOpenChange={setOpen}>
          <FocusModal.Trigger asChild>
            <IconButton variant="transparent" size="small" aria-label="Manage listing media">
              <MoreHorizontal className="h-4 w-4" />
            </IconButton>
          </FocusModal.Trigger>
          <FocusModal.Content>
            <FocusModal.Header><Heading level="h2">Listing media</Heading></FocusModal.Header>
            <FocusModal.Body className="px-6 py-6">
              <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <div className="flex justify-end">
                  <Button variant="secondary" size="small" onClick={() => inputRef.current?.click()} isLoading={pending}>
                    <Upload className="h-4 w-4" /> Upload image
                  </Button>
                  <input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void run(() => uploadProductMedia(product.id, [file]));
                  }} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((asset) => {
                    const role = getListingRole(product, asset.id);
                    return (
                      <div key={asset.id} className="overflow-hidden border border-ui-border-base">
                        <MediaPreview src={asset.contentUrl} mimeType={asset.mimeType} alt={asset.fileName} className="h-36 w-full bg-ui-bg-subtle object-contain" />
                        <div className="space-y-3 p-3">
                          <div className="flex items-center gap-2"><Image className="h-4 w-4 text-ui-fg-muted" /><Text size="small" className="min-w-0 flex-1 truncate">{asset.fileName}</Text>{asset.isProductOwned ? <IconButton type="button" variant="transparent" size="small" disabled={pending} aria-label={`Delete ${asset.fileName}`} onClick={() => void run(() => removeProductMedia(product.id, asset.id))}><Trash className="h-4 w-4 text-ui-fg-error" /></IconButton> : null}</div>
                          <div className="grid grid-cols-3 gap-1" aria-label={`Listing role for ${asset.fileName}`}>
                            {(["none", "default", "hover"] as const).map((option) => (
                              <Button key={option} type="button" size="small" disabled={pending} variant={role === option ? "primary" : "secondary"} onClick={() => assignRole(asset.id, option)}>
                                {option === "none" ? "None" : option === "default" ? "Default" : "Hover"}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {assets.length === 0 ? <Text size="small" className="text-ui-fg-subtle">Upload an image or add media to a variant to assign Listing Media.</Text> : null}
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      </div>
      <div className="grid grid-cols-2 divide-x border-t border-ui-border-base bg-ui-bg-subtle">
        {[["Default", defaultImage], ["Hover", hoverImage]].map(([label, asset]) => (
          <div key={label as string} className="min-w-0">
            <Text size="small" className="block px-4 py-2 text-ui-fg-subtle">{label as string}</Text>
            {asset ? <MediaPreview src={(asset as ProductVariantMedia).contentUrl} mimeType={(asset as ProductVariantMedia).mimeType} alt={(asset as ProductVariantMedia).fileName} className="h-40 w-full bg-ui-bg-subtle object-contain" /> : <div className="flex h-40 items-center justify-center"><Image className="h-8 w-8 text-ui-fg-muted" /></div>}
          </div>
        ))}
      </div>
    </Container>
  );
}
