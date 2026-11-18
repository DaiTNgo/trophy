import fs from "node:fs";
import path from "node:path";
import { FONT_FAMILIES, FONT_FILES } from "@trophy/customization";

// Default font files live in `fonts/` next to package.json (like `storage/`, resolved from the
// working directory). Override with FONTS_DIR when running from another location.
const fontsDir = () => process.env.FONTS_DIR || path.join(process.cwd(), "fonts");

const fontCache = new Map<string, Uint8Array<ArrayBuffer>>();

// Aliases are derived from the shared customization mapping so that default font
// files are declared in exactly one place (`FONT_FILES` / `FONT_FAMILIES`).
const FONT_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {};
  const add = (alias: string, file: string) => {
    aliases[alias.toLowerCase()] = file;
    aliases[`${alias.toLowerCase()}.ttf`] = file;
  };
  for (const [variantId, file] of Object.entries(FONT_FILES)) {
    add(variantId, file);
    add(file.replace(/\.ttf$/i, ""), file);
  }
  for (const [familyId, family] of Object.entries(FONT_FAMILIES)) {
    const file = FONT_FILES[family.regular];
    if (file) add(familyId, file);
  }
  return aliases;
})();

const DEFAULT_FONT_FILES = new Set(Object.values(FONT_FILES));

export function getStaticFontBytes(filename: string): Uint8Array<ArrayBuffer> | null {
  const canonicalFile = FONT_ALIASES[filename.toLowerCase().trim()] ?? (DEFAULT_FONT_FILES.has(filename) ? filename : null);
  if (!canonicalFile) return null;

  const cached = fontCache.get(canonicalFile);
  if (cached) return cached;

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(path.join(fontsDir(), canonicalFile));
  } catch {
    return null;
  }
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  fontCache.set(canonicalFile, bytes);
  return bytes;
}
