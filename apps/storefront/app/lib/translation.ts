export type LocalizedTextValue = {
  vi?: string;
  en?: string;
} | string | null | undefined;

export function getLocalized(value: LocalizedTextValue, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  
  if (typeof value === "object") {
    // try to get the requested locale
    if (locale === "en" && value.en) return value.en;
    if (locale === "vi" && value.vi) return value.vi;
    
    // fallback
    return value.vi || value.en || "";
  }
  
  return "";
}
