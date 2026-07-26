import { useEffect, useState } from "react";
import { Button, FocusModal, Heading, Input, Label, Text } from "@medusajs/ui";
import { type BrandFont } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export function AddFontModal({
  open,
  onOpenChange,
  existingFonts,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFonts: BrandFont[];
  onSuccess: () => void;
}) {
  const [fontName, setFontName] = useState("");
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [boldItalicFile, setBoldItalicFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFontName("");
      setRegularFile(null);
      setBoldFile(null);
      setItalicFile(null);
      setBoldItalicFile(null);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSave() {
    if (!fontName) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedFontId = createSlug(fontName);
      if (!generatedFontId) throw new Error("Invalid font name");
      if (existingFonts.some((font) => font.id === generatedFontId)) {
        throw new Error(`A font family with the name "${fontName}" already exists.`);
      }

      const uploadFile = async (file: File | null) => {
        if (!file) return null;
        const res = await backendFetch("/api/admin/brand-assets/fonts/upload", {
          method: "POST",
          headers: { "Content-Type": file.type || "font/ttf" },
          body: file,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Failed to upload ${file.name}`);
        }
        const data = await res.json();
        return data.assetId as string;
      };

      const [regularAssetId, boldAssetId, italicAssetId, boldItalicAssetId] = await Promise.all([
        uploadFile(regularFile),
        uploadFile(boldFile),
        uploadFile(italicFile),
        uploadFile(boldItalicFile),
      ]);

      const res = await backendFetch("/api/admin/brand-assets/fonts", {
        method: "POST",
        body: JSON.stringify({
          id: generatedFontId,
          name: fontName.trim(),
          regularAssetId,
          boldAssetId,
          italicAssetId,
          boldItalicAssetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create font family");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pendingCount = [regularFile, boldFile, italicFile, boldItalicFile].filter(Boolean).length;

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Add font family</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Upload one or more TTF variants — at least Regular is recommended.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="font-name">Family Name</Label>
              <Input
                id="font-name"
                placeholder="e.g. Roboto Slab"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-regular">Regular TTF</Label>
                <Input
                  id="font-regular"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setRegularFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-bold">Bold TTF</Label>
                <Input
                  id="font-bold"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setBoldFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-italic">Italic TTF</Label>
                <Input
                  id="font-italic"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setItalicFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="font-bold-italic">Bold Italic TTF</Label>
                <Input
                  id="font-bold-italic"
                  type="file"
                  accept=".ttf"
                  onChange={(e) => setBoldItalicFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {pendingCount > 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                {pendingCount} file{pendingCount > 1 ? "s" : ""} selected
              </Text>
            ) : null}
            {errorMessage ? (
              <div className="rounded-md border border-ui-border-error bg-ui-bg-error p-3">
                <Text size="small">{errorMessage}</Text>
              </div>
            ) : null}
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            <Button
              onClick={handleSave}
              isLoading={isSubmitting}
              disabled={!fontName.trim() || isSubmitting}
            >
              Create family
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

