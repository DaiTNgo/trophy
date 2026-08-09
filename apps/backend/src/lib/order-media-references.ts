import type { CustomizationFormValues } from "@trophy/customization";
import type { StoredBackgroundSnapshot, StoredCustomizationSnapshot } from "./order-utils";

export type RequiredOrderMediaReference =
  | { role: "background"; sourceAssetId: string; fieldId: null }
  | { role: "upload"; sourceAssetId: string; fieldId: string }
  | { role: "clipart"; sourceAssetId: string; fieldId: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectFieldMedia(values: CustomizationFormValues): RequiredOrderMediaReference[] {
  const references: RequiredOrderMediaReference[] = [];
  for (const [fieldId, value] of Object.entries(values)) {
    if (!isObject(value)) continue;
    if ("source" in value && value.source === "clipart" && "sourceAssetId" in value && typeof value.sourceAssetId === "string") {
      references.push({ role: "clipart", sourceAssetId: value.sourceAssetId, fieldId });
      continue;
    }
    if ("assetId" in value && typeof value.assetId === "string") {
      references.push({ role: "upload", sourceAssetId: value.assetId, fieldId });
    }
  }
  return references;
}

/** Lists the only media that must survive source catalog/library cleanup for one custom item. */
export function extractRequiredOrderMediaReferences(
  background: StoredBackgroundSnapshot | null,
  customization: StoredCustomizationSnapshot | null,
): RequiredOrderMediaReference[] {
  if (!customization) return [];

  const references: RequiredOrderMediaReference[] = [];
  if (background?.assetId) {
    references.push({ role: "background", sourceAssetId: background.assetId, fieldId: null });
  }
  references.push(...collectFieldMedia(customization.values));
  return references;
}
