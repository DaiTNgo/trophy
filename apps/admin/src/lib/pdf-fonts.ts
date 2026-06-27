
// ─── font file map ────────────────────────────────────────────────────────────
// Admin-managed: users select from pre-approved fonts; no custom uploads.

export const fontFiles: Record<string, string> = {
  "sans-bold": "SansBold.ttf",
  "serif-display": "SerifDisplay.ttf",
  "script-elegant": "ScriptElegant.ttf",
};

// ─── raw bytes cache (shared between pdf-lib embed + opentype parse) ──────────

const fontBytesCache = new Map<string, Uint8Array>();

export async function loadFontBytes(fontId: string): Promise<Uint8Array | null> {
  if (fontBytesCache.has(fontId)) return fontBytesCache.get(fontId)!;
  const filename = fontFiles[fontId];
  if (!filename) return null;
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
  const url = `${backendUrl}/fonts/${filename}`;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  fontBytesCache.set(fontId, bytes);
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
