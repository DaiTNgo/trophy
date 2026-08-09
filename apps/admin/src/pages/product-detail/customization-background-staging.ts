import type { BackgroundAsset } from "@trophy/customization";

export type StagedCustomizationBackground = {
  file: File;
  widthPx: number;
  heightPx: number;
  previewUrl?: string;
};

type CanvasDimensions = {
  widthPx: number;
  heightPx: number;
};

export type StagedCustomizationMediaReadiness =
  | { ready: false }
  | ({ ready: true } & CanvasDimensions);

export function stagedCustomizationMediaReadiness(
  variantIds: string[],
  stagedMedia: Record<string, StagedCustomizationBackground>,
  expectedCanvas?: CanvasDimensions,
): StagedCustomizationMediaReadiness {
  if (variantIds.length === 0) return { ready: false };

  const first = stagedMedia[variantIds[0]];
  if (!first || !hasValidDimensions(first)) return { ready: false };

  const dimensions = { widthPx: first.widthPx, heightPx: first.heightPx };
  if (
    expectedCanvas &&
    (dimensions.widthPx !== expectedCanvas.widthPx ||
      dimensions.heightPx !== expectedCanvas.heightPx)
  ) {
    return { ready: false };
  }

  const everyVariantMatches = variantIds.every((variantId) => {
    const staged = stagedMedia[variantId];
    return (
      staged &&
      hasValidDimensions(staged) &&
      staged.widthPx === dimensions.widthPx &&
      staged.heightPx === dimensions.heightPx
    );
  });

  return everyVariantMatches
    ? { ready: true, ...dimensions }
    : { ready: false };
}

function hasValidDimensions(staged: StagedCustomizationBackground) {
  return (
    Number.isInteger(staged.widthPx) &&
    Number.isInteger(staged.heightPx) &&
    staged.widthPx > 0 &&
    staged.heightPx > 0
  );
}

export function stagedBackgroundPreview(
  variantId: string,
  staged: StagedCustomizationBackground | undefined,
  previewUrl: string | undefined,
): BackgroundAsset | null {
  if (!staged || !previewUrl) return null;
  return {
    assetId: variantId,
    previewUrl,
    filename: staged.file.name,
    mimeType: staged.file.type,
    widthPx: staged.widthPx,
    heightPx: staged.heightPx,
  };
}
