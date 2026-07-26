import { useEffect, useState } from "react";
import { Button, FocusModal, Heading, Input, Label, Text } from "@medusajs/ui";
import { type BrandColor } from "../hooks/use-brand-assets";
import { backendFetch } from "../lib/fetch";

const createSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export function AddColorModal({
  open,
  onOpenChange,
  existingColors,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingColors: BrandColor[];
  onSuccess: () => void;
}) {
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setColorName("");
      setColorHex("#000000");
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSave() {
    if (!colorName || !colorHex) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedColorId = createSlug(colorName);
      if (!generatedColorId) throw new Error("Invalid color name");
      if (existingColors.some((color) => color.id === generatedColorId)) {
        throw new Error(`A color with the name "${colorName}" already exists.`);
      }

      const res = await backendFetch("/api/admin/brand-assets/colors", {
        method: "POST",
        body: JSON.stringify({ id: generatedColorId, name: colorName.trim(), hexCode: colorHex }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add color");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add color");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-y-1 text-left">
            <Heading level="h2">Add color</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Give the color a name and pick its hex value.
            </Text>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="color-name">Name</Label>
              <Input
                id="color-name"
                placeholder="e.g. Primary Gold"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="color-hex">Hex Code</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-10 h-10 p-1 bg-white border border-ui-border-base rounded cursor-pointer"
                  disabled={isSubmitting}
                />
                <Input
                  id="color-hex"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
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
              disabled={!colorName.trim() || isSubmitting}
            >
              Add color
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

