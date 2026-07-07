import * as v from "valibot";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

export const localeSchema = v.picklist(SUPPORTED_LOCALES);

export function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export const localizedString = (minLength = 1, maxLength = 200) =>
  v.object({
    vi: v.pipe(v.string(), v.trim(), v.minLength(minLength), v.maxLength(maxLength)),
    en: v.optional(v.union([
      v.pipe(v.string(), v.trim(), v.maxLength(maxLength)),
      v.null(),
      v.undefined()
    ]))
  });

export const localizedNullableText = (maxLength = 2000) =>
  v.object({
    vi: v.optional(v.union([
      v.pipe(v.string(), v.trim(), v.maxLength(maxLength)),
      v.null(),
      v.undefined()
    ])),
    en: v.optional(v.union([
      v.pipe(v.string(), v.trim(), v.maxLength(maxLength)),
      v.null(),
      v.undefined()
    ]))
  });
