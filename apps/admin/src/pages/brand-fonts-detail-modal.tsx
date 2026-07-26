import { useEffect, useState } from "react";
import { Badge, Button, FocusModal, Heading, Text } from "@medusajs/ui";
import { CheckCircle, XCircle } from "lucide-react";
import { type BrandFont } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

type VariantKey = "regularAssetId" | "boldAssetId" | "italicAssetId" | "boldItalicAssetId";

const VARIANTS: { key: VariantKey; label: string; uploadParam: string }[] = [
  { key: "regularAssetId", label: "Regular", uploadParam: "regular" },
  { key: "boldAssetId", label: "Bold", uploadParam: "bold" },
  { key: "italicAssetId", label: "Italic", uploadParam: "italic" },
  { key: "boldItalicAssetId", label: "Bold Italic", uploadParam: "boldItalic" },
];


export function FontDetailModal({
  font,
  onClose,
  onDeleted,
  onUpdated,
}: {
  font: BrandFont | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [uploadingKey, setUploadingKey] = useState<VariantKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!font) {
      setUploadingKey(null);
      setErrorMessage(null);
    }
  }, [font]);

  if (!font) return null;

  async function handleUploadVariant(key: VariantKey, file: File) {
    if (!font) return;
    setUploadingKey(key);
    setErrorMessage(null);
    try {
      const uploadRes = await backendFetch("/api/admin/brand-assets/fonts/upload", {
        method: "POST",
        headers: { "Content-Type": file.type || "font/ttf" },
        body: file,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }
      const { assetId } = await uploadRes.json();

      const patchRes = await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [key]: assetId }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => null);
        throw new Error(data?.error || "Failed to save variant");
      }
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload variant");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleRemoveVariant(key: VariantKey) {
    if (!font) return;
    setUploadingKey(key);
    setErrorMessage(null);
    try {
      const res = await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [key]: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to remove variant");
      }
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove variant");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleDelete() {
    if (!font) return;
    setErrorMessage(null);
    try {
      await backendFetch(`/api/admin/brand-assets/fonts/${font.id}`, { method: "DELETE" });
      onDeleted();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete font");
    }
  }

  return (
    <FocusModal open={!!font} onOpenChange={(open) => { if (!open) onClose(); }}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">{font.name}</Heading>
            <Text size="small" className="text-ui-fg-subtle font-mono">
              {font.id}
            </Text>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
            <div className="flex flex-col gap-1">
              <Heading level="h3" className="text-base font-medium">Variants</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Upload a TTF file to add or replace a variant. Remove to unlink without deleting the asset.
              </Text>
            </div>

            <div className="flex flex-col gap-3">
              {VARIANTS.map(({ key, label }) => {
                const hasFile = !!font[key];
                const busy = uploadingKey === key;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3"
                  >
                    {/* Status icon */}
                    {hasFile ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-ui-fg-positive" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-ui-fg-muted" />
                    )}

                    {/* Label */}
                    <Text size="small" weight="plus" className="w-24 shrink-0">
                      {label}
                    </Text>

                    {/* Status badge */}
                    <Badge color={hasFile ? "green" : "grey"} className="shrink-0">
                      {hasFile ? "Uploaded" : "Missing"}
                    </Badge>

                    {/* Actions — pushed right */}
                    <div className="ml-auto flex items-center gap-2">
                      {/* Replace / upload */}
                      <label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                        <input
                          type="file"
                          accept=".ttf"
                          className="sr-only"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadVariant(key, file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="small"
                          isLoading={busy}
                          disabled={busy}
                          asChild
                        >
                          <span>{hasFile ? "Replace" : "Upload"}</span>
                        </Button>
                      </label>

                      {/* Remove */}
                      {hasFile ? (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleRemoveVariant(key)}
                          disabled={busy}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
                <Text size="small">{errorMessage}</Text>
              </div>
            ) : null}

            {/* Danger zone */}
            <div className="border-t border-ui-border-base pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="small" weight="plus">Delete font family</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    Permanently removes this family and unlinks all variants.
                  </Text>
                </div>
                <Button variant="danger" size="small" onClick={handleDelete}>
                  Delete family
                </Button>
              </div>
            </div>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button variant="secondary">Close</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

