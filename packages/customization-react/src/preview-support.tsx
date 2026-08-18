import {
  FONT_FILES,
  type DynamicFontFamily,
  type RuntimeLayer,
} from "@trophy/customization";
import type { ReactNode } from "react";
import { Button } from "./index";
import type {
  ResolveCustomizationFontUrl,
  ResolveCustomizationStaticFontUrl,
} from "./index";

const WATERMARK_LABELS = Array.from({ length: 36 }, (_, index) => index);

export function CustomizationWatermark() {
  return (
    <div
      aria-hidden="true"
      data-preview-watermark="phùng thị"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
      style={{ opacity: 0.06, mixBlendMode: "difference" }}
    >
      <div
        className="absolute inset-[-35%] grid grid-cols-6 content-center gap-x-16 gap-y-16"
        style={{ transform: "rotate(-24deg)" }}
      >
        {WATERMARK_LABELS.map((index) => (
          <span
            key={index}
            className="whitespace-nowrap text-sm font-semibold tracking-[0.16em] text-white sm:text-base"
          >
            phùng thị
          </span>
        ))}
      </div>
    </div>
  );
}

export function CanvasAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      title={label}
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

export function FontLoader({
  layers,
  fontIds: additionalFontIds = [],
  dynamicFonts = [],
  resolveFontUrl,
  resolveStaticFontUrl,
}: {
  layers: RuntimeLayer[];
  fontIds?: string[];
  dynamicFonts?: DynamicFontFamily[];
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
}) {
  const fontIds = Array.from(
    new Set(
      layers
        .filter(
          (layer): layer is Extract<RuntimeLayer, { type: "text" }> =>
            layer.type === "text" && !!layer.fontId,
        )
        .map((layer) => layer.fontId)
        .concat(additionalFontIds),
    ),
  );
  const dynamicFontAssetIds = new Set(
    dynamicFonts
      .flatMap((font) => [
        font.regularAssetId,
        font.boldAssetId,
        font.italicAssetId,
        font.boldItalicAssetId,
      ])
      .filter((assetId): assetId is string => Boolean(assetId)),
  );

  return (
    <>
      {fontIds.map((fontId) => {
        if (dynamicFontAssetIds.has(fontId)) {
          return (
            <style
              key={fontId}
              dangerouslySetInnerHTML={{
                __html: `
                  @font-face {
                    font-family: '${fontId}';
                    src: url('${resolveFontUrl?.(fontId) ?? fontId}') format('truetype');
                  }
                `,
              }}
            />
          );
        }

        const file = FONT_FILES[fontId];
        if (!file) return null;
        return (
          <style
            key={fontId}
            dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: '${fontId}';
                  src: url('${resolveStaticFontUrl?.(file) ?? `/fonts/${file}`}') format('truetype');
                }
              `,
            }}
          />
        );
      })}
    </>
  );
}
