/**
 * Utility helpers for generating and validating URL slugs from Vietnamese text.
 *
 * Vietnamese contains tone marks and combining diacritics that must be removed
 * and normalised before use in a URL path segment.
 */

/**
 * Map of Vietnamese composed characters to their ASCII equivalents.
 * Covers the full Vietnamese alphabet including tonal variants.
 */
const VI_MAP: Record<string, string> = {
  // a variants
  à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
  â: "a", ầ: "a", ấ: "a", ẩ: "a", ẫ: "a", ậ: "a",
  ă: "a", ằ: "a", ắ: "a", ẳ: "a", ẵ: "a", ặ: "a",
  // A variants
  À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a",
  Â: "a", Ầ: "a", Ấ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
  Ă: "a", Ằ: "a", Ắ: "a", Ẳ: "a", Ẵ: "a", Ặ: "a",
  // d
  đ: "d", Đ: "d",
  // e variants
  è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
  ê: "e", ề: "e", ế: "e", ể: "e", ễ: "e", ệ: "e",
  È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e",
  Ê: "e", Ề: "e", Ế: "e", Ể: "e", Ễ: "e", Ệ: "e",
  // i variants
  ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
  Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
  // o variants
  ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
  ô: "o", ồ: "o", ố: "o", ổ: "o", ỗ: "o", ộ: "o",
  ơ: "o", ờ: "o", ớ: "o", ở: "o", ỡ: "o", ợ: "o",
  Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o",
  Ô: "o", Ồ: "o", Ố: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
  Ơ: "o", Ờ: "o", Ớ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
  // u variants
  ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
  ư: "u", ừ: "u", ứ: "u", ử: "u", ữ: "u", ự: "u",
  Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u",
  Ư: "u", Ừ: "u", Ứ: "u", Ử: "u", Ữ: "u", Ự: "u",
  // y variants
  ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
  Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y",
};

/**
 * Converts a Vietnamese title string to a URL-safe ASCII kebab-case slug.
 *
 * Examples:
 *   "Kỷ Niệm Chương Pha Lê"  → "ky-niem-chuong-pha-le"
 *   "Quà Tặng Khánh Thành"   → "qua-tang-khanh-thanh"
 */
export function slugify(text: string): string {
  return text
    .split("")
    .map((ch) => VI_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // remove remaining non-ASCII
    .trim()
    .replace(/[\s-]+/g, "-");         // collapse whitespace / hyphens
}

/**
 * Generates a unique slug by appending an incrementing numeric suffix when
 * the base slug already exists in the database.
 *
 * @param base - Pre-slugified string (output of `slugify`).
 * @param exists - An async predicate that resolves `true` when the given slug
 *                 is already taken.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;

  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Fallback: append timestamp-based suffix
  return `${base}-${Date.now()}`;
}
