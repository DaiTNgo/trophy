import { useState, useRef } from "react";
import { Input, Popover, Text } from "@medusajs/ui";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";

type ColorSwatchProps = {
  colorHex?: string | null;
  onChange: (hex: string | null) => void;
};

const DEFAULT_PRESET_COLORS = [
  "#000000",
  "#FFFFFF",
  "#6B7280",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#D97706",
  "#B45309",
  "#78350F",
  "#E5E7EB",
];

export function ColorSwatchPicker({ colorHex, onChange }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(colorHex ?? "#000000");

  const effectiveColor = colorHex?.trim() || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="group relative flex size-7 shrink-0 items-center justify-center rounded-full border border-ui-border-base transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive"
          style={{
            backgroundColor: effectiveColor ?? "#FFFFFF",
          }}
          title={effectiveColor ? `Color: ${effectiveColor}` : "Choose color"}
          aria-label="Choose color swatch"
        >
          {!effectiveColor && (
            <span className="block size-2 rounded-full bg-ui-fg-muted" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content className="w-64 space-y-3 p-3">
        <div className="flex items-center justify-between">
          <Text size="small" weight="plus">
            Color Swatch
          </Text>
          {effectiveColor && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs text-ui-fg-muted hover:text-ui-fg-error"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={effectiveColor ?? draftHex}
            onChange={(e) => {
              setDraftHex(e.target.value);
              onChange(e.target.value);
            }}
            className="size-8 shrink-0 cursor-pointer rounded border border-ui-border-base p-0.5 bg-transparent"
          />
          <Input
            size="small"
            value={draftHex}
            onChange={(e) => {
              const val = e.target.value;
              setDraftHex(val);
              if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
                onChange(val);
              }
            }}
            placeholder="#000000"
            className="font-mono text-xs"
          />
        </div>

        <div>
          <Text size="xsmall" className="mb-1.5 text-ui-fg-muted">
            Presets
          </Text>
          <div className="grid grid-cols-8 gap-1.5">
            {DEFAULT_PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="size-5 rounded-full border border-ui-border-base transition-transform hover:scale-110"
                style={{ backgroundColor: preset }}
                onClick={() => {
                  setDraftHex(preset);
                  onChange(preset);
                  setOpen(false);
                }}
                title={preset}
              />
            ))}
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}

type ImageSwatchProps = {
  swatchAssetUrl?: string | null;
  onChange: (data: { swatchAssetId: string | null; swatchAssetUrl: string | null }) => void;
};

export function ImageSwatchPicker({ swatchAssetUrl, onChange }: ImageSwatchProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const asset = await uploadProductVariantMedia(file);
      onChange({
        swatchAssetId: asset.id,
        swatchAssetUrl: asset.contentUrl,
      });
    } catch (err) {
      console.error("Failed to upload swatch asset", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="relative inline-flex shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex size-8 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-component">
          <Loader2 className="size-4 animate-spin text-ui-fg-muted" />
        </div>
      ) : swatchAssetUrl ? (
        <div className="group relative size-8 overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-subtle">
          <img
            src={swatchAssetUrl}
            alt="Swatch preview"
            className="size-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange({ swatchAssetId: null, swatchAssetUrl: null })}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            title="Remove swatch"
            aria-label="Remove swatch"
          >
            <X className="size-3.5 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-8 items-center justify-center rounded-md border border-dashed border-ui-border-base bg-ui-bg-component text-ui-fg-muted transition-colors hover:border-ui-border-interactive hover:text-ui-fg-base"
          title="Upload image swatch"
          aria-label="Upload image swatch"
        >
          <ImagePlus className="size-3.5" />
        </button>
      )}
    </div>
  );
}
