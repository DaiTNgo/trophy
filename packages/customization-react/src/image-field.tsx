import {
  getImageShapeClipartCategoryMode,
  type ClipartFieldValue,
  type CustomizationFieldValue,
  type ImageShapeFieldValue,
  type ImageShapeEditorLayer,
} from "@trophy/customization";
import { useEffect, useState } from "react";
import { ImagePlus, RotateCw, X } from "lucide-react";
import type { ResolveCustomizationAssetUrl } from "./index";

export function ImageField({
  layer,
  value,
  uploading,
  resolveAssetUrl,
  onChange,
  onUpload,
  onRemove,
}: {
  layer: ImageShapeEditorLayer | null;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onChange: (value: ImageShapeFieldValue | ClipartFieldValue | null) => void;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}) {
  const sourcePolicy = layer?.sourcePolicy ?? "upload_only";
  const clipartCategoryMode = layer
    ? getImageShapeClipartCategoryMode(layer)
    : "fixed";
  const uploaded =
    value && typeof value === "object" && "assetId" in value ? value : null;
  const clipartValue =
    value &&
    typeof value === "object" &&
    "source" in value &&
    value.source === "clipart"
      ? value
      : null;
  const scopedClipartCategories = !layer
    ? []
    : clipartCategoryMode === "allow_list"
      ? (layer.allowedClipartCategories ?? [])
      : layer.clipartCategory
        ? [layer.clipartCategory]
        : [];
  const initialCategoryId =
    clipartValue?.categoryId ??
    (clipartCategoryMode === "fixed"
      ? layer?.clipartCategory?.id
      : scopedClipartCategories[0]?.id) ??
    "";
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(initialCategoryId);
  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (clipartCategoryMode === "fixed") {
        return layer?.clipartCategory?.id ?? "";
      }
      const allowedIds = new Set(
        scopedClipartCategories.map((category) => category.id),
      );
      if (current && allowedIds.has(current)) {
        return current;
      }
      if (clipartValue?.categoryId && allowedIds.has(clipartValue.categoryId)) {
        return clipartValue.categoryId;
      }
      return scopedClipartCategories[0]?.id ?? "";
    });
  }, [
    clipartCategoryMode,
    layer?.clipartCategory?.id,
    clipartValue?.categoryId,
    layer?.id,
    scopedClipartCategories,
  ]);
  const scopedCategoryIds = new Set(
    scopedClipartCategories.map((category) => category.id),
  );
  const activeCategoryId =
    clipartCategoryMode === "fixed"
      ? (layer?.clipartCategory?.id ?? "")
      : selectedCategoryId || scopedClipartCategories[0]?.id || "";
  const availableClipartAssets = (layer?.clipartAssets ?? []).filter(
    (asset) => {
      if (!asset.active || !scopedCategoryIds.has(asset.categoryId))
        return false;
      if (!activeCategoryId) return true;
      return asset.categoryId === activeCategoryId;
    },
  );
  const currentSource =
    sourcePolicy === "clipart_category_only"
      ? "clipart"
      : clipartValue
        ? "clipart"
        : "upload";

  const uploadSection = (
    <div className="space-y-2.5">
      {!uploaded ? (
        <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-outline bg-white px-4 text-sm text-on-surface-variant transition hover:border-accent hover:text-accent">
          <ImagePlus className="size-4" />
          {uploading ? "Uploading..." : "Choose PNG or JPEG"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
            className="sr-only"
          />
        </label>
      ) : (
        <div className="flex items-center gap-3">
          <img
            src={resolveAssetUrl?.(uploaded.previewUrl) ?? uploaded.previewUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded object-cover"
          />
          <div className="flex flex-1 items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-outline bg-white px-3 text-xs font-semibold text-on-surface transition hover:border-accent">
              <RotateCw className="size-3" />
              Replace
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              aria-label="Remove image"
              disabled={uploading}
              onClick={onRemove ?? (() => onChange(null))}
              className="flex h-8 items-center gap-1.5 rounded border border-outline bg-white px-3 text-xs font-semibold text-destructive transition hover:border-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="size-3" />
              Remove
            </button>
          </div>
        </div>
      )}
      {uploaded ? (
        <p className="text-[11px] leading-snug text-on-surface-variant">
          Click the image on the preview to move and position it.
        </p>
      ) : null}
    </div>
  );

  const clipartSection = (
    <div className="space-y-3">
      {clipartCategoryMode === "allow_list" &&
      scopedClipartCategories.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Category
          </p>
          <select
            value={activeCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="h-9 w-full rounded border border-outline bg-white px-3 text-sm text-on-surface outline-none focus:border-accent"
          >
            {scopedClipartCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : clipartCategoryMode === "fixed" && layer?.clipartCategory?.name ? (
        <p className="text-xs font-semibold text-on-surface-variant">
          {layer.clipartCategory.name}
        </p>
      ) : null}
      {/* Dense 6-col icon grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {availableClipartAssets.map((clipart) => {
          const selected =
            clipartValue &&
            "clipartAssetId" in clipartValue &&
            clipartValue.clipartAssetId === clipart.id;
          return (
            <button
              key={clipart.id}
              type="button"
              title={clipart.name}
              onClick={() =>
                onChange({
                  source: "clipart",
                  clipartAssetId: clipart.id,
                  clipartAssetName: clipart.name,
                  sourceAssetId: clipart.sourceAssetId,
                  previewUrl: clipart.previewUrl,
                  mimeType: clipart.mimeType,
                  sourceWidthPx: clipart.sourceWidthPx,
                  sourceHeightPx: clipart.sourceHeightPx,
                  categoryId: clipart.categoryId,
                })
              }
              className={`flex aspect-square items-center justify-center rounded border p-1 transition ${
                selected
                  ? "border-accent bg-accent/10 ring-1 ring-accent"
                  : "border-outline-variant bg-white hover:border-accent hover:bg-accent/5"
              }`}
            >
              <img
                src={
                  resolveAssetUrl?.(clipart.previewUrl) ?? clipart.previewUrl
                }
                alt={clipart.name}
                className="h-10 w-10 object-contain"
              />
            </button>
          );
        })}
      </div>
      {clipartValue ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive"
        >
          <X className="size-3.5" />
          Clear selection
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {sourcePolicy === "upload_only" ? uploadSection : null}
      {sourcePolicy === "clipart_category_only" ? clipartSection : null}
      {sourcePolicy === "upload_or_clipart_category" &&
      layer?.presentation === "source_select" ? (
        <>
          <div className="flex gap-1 rounded border border-outline bg-surface-container p-0.5">
            <button
              type="button"
              onClick={() => {
                if (availableClipartAssets[0]) {
                  const clipart = availableClipartAssets[0];
                  if (clipartCategoryMode === "allow_list") {
                    setSelectedCategoryId(clipart.categoryId);
                  }
                  onChange({
                    source: "clipart",
                    clipartAssetId: clipart.id,
                    clipartAssetName: clipart.name,
                    sourceAssetId: clipart.sourceAssetId,
                    previewUrl: clipart.previewUrl,
                    mimeType: clipart.mimeType,
                    sourceWidthPx: clipart.sourceWidthPx,
                    sourceHeightPx: clipart.sourceHeightPx,
                    categoryId: clipart.categoryId,
                  });
                }
              }}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition ${
                currentSource === "clipart"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Clipart
            </button>
            <button
              type="button"
              onClick={() => onChange(uploaded ?? null)}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition ${
                currentSource === "upload"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Upload image
            </button>
          </div>
          {currentSource === "clipart" ? clipartSection : uploadSection}
        </>
      ) : null}
      {sourcePolicy === "upload_or_clipart_category" &&
      layer?.presentation === "side_by_side" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
              Clipart
            </p>
            {clipartSection}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
              Upload image
            </p>
            {uploadSection}
          </div>
        </div>
      ) : null}
    </div>
  );
}
