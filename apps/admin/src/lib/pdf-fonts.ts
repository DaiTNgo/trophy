import { FONT_FILES } from "@trophy/customization";

export const fontFiles: Record<string, string> = {
  ...FONT_FILES,
  "sans": "SansBold.ttf",
  "sans-regular": "SansBold.ttf",
  "sans-bold": "SansBold.ttf",
  "sans-italic": "SansBold.ttf",
  "sans-bold-italic": "SansBold.ttf",
  "serif": "SerifDisplay.ttf",
  "serif-regular": "SerifDisplay.ttf",
  "serif-bold": "SerifDisplay.ttf",
  "serif-italic": "SerifDisplay.ttf",
  "serif-bold-italic": "SerifDisplay.ttf",
  "script": "ScriptElegant.ttf",
  "script-regular": "ScriptElegant.ttf",
  "script-bold": "ScriptElegant.ttf",
  "script-italic": "ScriptElegant.ttf",
  "script-bold-italic": "ScriptElegant.ttf",
};

// ─── raw bytes cache (shared between pdf-lib embed + opentype parse) ──────────

const fontBytesCache = new Map<string, Uint8Array>();

export async function loadFontBytes(variantId: string): Promise<Uint8Array | null> {
  if (fontBytesCache.has(variantId)) return fontBytesCache.get(variantId)!;
  const filename = fontFiles[variantId] ?? FONT_FILES[variantId];
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
  
  // If filename exists in fontFiles, it's a static font.
  // Otherwise, assume variantId is an assetId from the database.
  const url = filename 
    ? `${backendUrl}/fonts/${filename}`
    : `${backendUrl}/api/admin/brand-assets/fonts/file/${variantId}`;
    
  let response = await fetch(url).catch(() => null);
  if (!response?.ok && !filename) {
    // Fallback to storefront font asset route if admin route returns 404
    response = await fetch(`${backendUrl}/api/storefront/brand-assets/fonts/file/${variantId}`).catch(() => null);
  }
  if (!response?.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  fontBytesCache.set(variantId, bytes);
  return bytes;
}


// ─── CSS font-face URL (for SVG-based fallback if ever needed) ────────────────

const fontCssUrlCache = new Map<string, string>();

export async function getFontCssUrl(fontId: string): Promise<string | null> {
  if (fontCssUrlCache.has(fontId)) return fontCssUrlCache.get(fontId)!;
  const bytes = await loadFontBytes(fontId);
  if (!bytes) return null;
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "font/ttf" });

  const url = URL.createObjectURL(blob);
  fontCssUrlCache.set(fontId, url);
  return url;
}
