import { FONT_FAMILIES, FONT_FILES } from "@trophy/customization";
import { BACKEND_URL } from "./fetch";

// Family ids ("sans", "serif", "script") resolve to their regular file; style
// variants come straight from the shared mapping.
const fontFiles: Record<string, string> = {
  ...FONT_FILES,
  ...Object.fromEntries(
    Object.entries(FONT_FAMILIES).flatMap(([familyId, family]) => {
      const file = FONT_FILES[family.regular];
      return file ? [[familyId, file]] : [];
    }),
  ),
};

// ─── raw bytes cache (shared between pdf-lib embed + opentype parse) ──────────

export type LoadedFont = {
  bytes: Uint8Array | null;
  /**
   * True when the requested font could not be loaded. `bytes` then holds the
   * default Sans file (so an export can still be produced) or null when even
   * that is unreachable. Callers must surface this to the operator.
   */
  unavailable: boolean;
};

const fontCache = new Map<string, LoadedFont>();
const DEFAULT_FALLBACK_FILE = fontFiles.sans!;

async function fetchBytes(url: string) {
  const response = await fetch(url).catch(() => null);
  return response?.ok ? new Uint8Array(await response.arrayBuffer()) : null;
}

export async function loadFontBytes(variantId: string): Promise<LoadedFont> {
  const cached = fontCache.get(variantId);
  if (cached) return cached;

  const filename = fontFiles[variantId];
  let bytes: Uint8Array | null;
  if (filename) {
    // Default font: served from the bundled static files.
    bytes = await fetchBytes(`${BACKEND_URL}/fonts/${filename}`);
  } else {
    // Otherwise variantId is a Brand Font asset id.
    bytes =
      (await fetchBytes(`${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${variantId}`)) ??
      (await fetchBytes(`${BACKEND_URL}/api/admin/brand-assets/fonts/file/${variantId}`));
  }

  let result: LoadedFont;
  if (bytes) {
    result = { bytes, unavailable: false };
  } else {
    const fallback = await fetchBytes(`${BACKEND_URL}/fonts/${DEFAULT_FALLBACK_FILE}`);
    result = { bytes: fallback, unavailable: true };
  }
  fontCache.set(variantId, result);
  return result;
}
