import { useMemo, useRef, useState } from "react";
import { Button, Container, FocusModal, Heading, IconButton, Text, toast } from "@medusajs/ui";
import { Image, MoreHorizontal, Upload } from "lucide-react";
import type { CatalogProduct } from "../../types";
import { setProductThumbnail, uploadProductMedia } from "../../lib/products-client";
import { MediaPreview } from "../../components/ui/media-preview";

type Props = { product: CatalogProduct; mutate: () => Promise<void> };

export function ProductDetailThumbnail({ product, mutate }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = useMemo(() => product.variants.flatMap((variant) => [
    ...variant.media,
    ...(variant.customizationMedia ? [variant.customizationMedia] : []),
  ]).filter((asset, index, all) => all.findIndex((candidate) => candidate.id === asset.id) === index), [product.variants]);
  const thumbnail = [...assets, ...product.media].find((asset) => asset.id === product.thumbnailAssetId) ?? null;

  async function run(command: () => Promise<unknown>) {
    setPending(true);
    try { await command(); await mutate(); }
    catch (error) { toast.error("Thumbnail could not be updated", { description: error instanceof Error ? error.message : "Try again." }); }
    finally { setPending(false); }
  }

  return <Container className="overflow-hidden p-0"><div className="flex items-center justify-between px-6 py-4"><div><Heading level="h2" className="text-xl font-semibold">Thumbnail</Heading><Text size="small" className="mt-1 text-ui-fg-subtle">Choose an asset from a variant, or upload one image for this product.</Text></div><FocusModal open={open} onOpenChange={setOpen}><FocusModal.Trigger asChild><IconButton variant="transparent" size="small"><MoreHorizontal className="h-4 w-4" /></IconButton></FocusModal.Trigger><FocusModal.Content><FocusModal.Header><Heading level="h2">Choose thumbnail</Heading></FocusModal.Header><FocusModal.Body className="px-6 py-6"><div className="mx-auto flex max-w-5xl flex-col gap-6"><div className="flex justify-end"><Button variant="secondary" size="small" onClick={() => inputRef.current?.click()} isLoading={pending}><Upload className="h-4 w-4" />Upload thumbnail</Button><input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void run(() => uploadProductMedia(product.id, [file])); }} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assets.map((asset) => <button key={asset.id} type="button" disabled={pending} onClick={() => void run(() => setProductThumbnail(product.id, asset.id))} className={`overflow-hidden border text-left ${product.thumbnailAssetId === asset.id ? "border-ui-border-interactive ring-1 ring-ui-border-interactive" : "border-ui-border-base hover:border-ui-border-strong"}`}><MediaPreview src={asset.contentUrl} mimeType={asset.mimeType} alt={asset.fileName} className="h-36 w-full bg-ui-bg-subtle object-contain" /><div className="flex items-center gap-2 p-3"><Image className="h-4 w-4 text-ui-fg-muted" /><Text size="small" className="truncate">{asset.fileName}</Text></div></button>)}</div>{assets.length === 0 ? <Text size="small" className="text-ui-fg-subtle">No Variant Media or Customization Background is available.</Text> : null}</div></FocusModal.Body></FocusModal.Content></FocusModal></div>{thumbnail ? <MediaPreview src={thumbnail.contentUrl} mimeType={thumbnail.mimeType} alt={thumbnail.fileName} className="h-48 w-full border-t border-ui-border-base bg-ui-bg-subtle object-contain" /> : null}</Container>;
}
