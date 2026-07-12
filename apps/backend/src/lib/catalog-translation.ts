import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { catalogTranslations } from "../db/schema";
import { type Locale, SUPPORTED_LOCALES } from "./locale";

export type OwnerType =
  | "product"
  | "product_option"
  | "product_option_value"
  | "product_category"
  | "product_collection"
  | "product_attribute"
  | "product_variant"
  | "customization_form_field"
  | "customization_layer";

export type LocalizedField = Record<Locale, string>;

/**
 * Upserts translations for a specific field of an owner.
 */
export async function upsertTranslations(
  db: Database,
  ownerType: OwnerType,
  ownerKey: string,
  fieldName: string,
  values: Partial<Record<Locale, string | null>>
) {
  for (const locale of SUPPORTED_LOCALES) {
    const value = values[locale];
    if (value !== undefined && value !== null) {
      await db
        .insert(catalogTranslations)
        .values({
          ownerType,
          ownerKey,
          fieldName,
          locale,
          value,
        })
        .onConflictDoUpdate({
          target: [
            catalogTranslations.ownerType,
            catalogTranslations.ownerKey,
            catalogTranslations.fieldName,
            catalogTranslations.locale,
          ],
          set: {
            value,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
    } else if (value === null) {
      // If explicitly null, delete it
      await db
        .delete(catalogTranslations)
        .where(
          and(
            eq(catalogTranslations.ownerType, ownerType),
            eq(catalogTranslations.ownerKey, ownerKey),
            eq(catalogTranslations.fieldName, fieldName),
            eq(catalogTranslations.locale, locale)
          )
        );
    }
  }
}

/**
 * Loads translations for a specific owner.
 * Returns a map of fieldName -> Record<Locale, string>
 */
export async function loadTranslationsForOwner(
  db: Database,
  ownerType: OwnerType,
  ownerKey: string
): Promise<Record<string, LocalizedField>> {
  const rows = await db
    .select()
    .from(catalogTranslations)
    .where(
      and(
        eq(catalogTranslations.ownerType, ownerType),
        eq(catalogTranslations.ownerKey, ownerKey)
      )
    );

  const result: Record<string, LocalizedField> = {};
  for (const row of (rows || [])) {
    if (!result[row.fieldName]) {
      result[row.fieldName] = {} as LocalizedField;
    }
    result[row.fieldName][row.locale as Locale] = row.value;
  }
  return result;
}

/**
 * Hydrates multiple items with their localized fields.
 */
export async function hydrateTranslations<T extends object>(
  db: Database,
  ownerType: OwnerType,
  items: T[],
  idExtractor: (item: T) => string,
  fieldsToHydrate: Array<{ fieldName: string; objectKey: keyof T }>,
  canonicalFallbacks: Array<{ fieldName: string; objectKey: keyof T }> = []
): Promise<T[]> {
  if (items.length === 0) return items;

  if (items.length === 0) return items;

  const ownerKeys = items.map(idExtractor);

  const rows = await db
    .select()
    .from(catalogTranslations)
    .where(
      and(
        eq(catalogTranslations.ownerType, ownerType),
        inArray(catalogTranslations.ownerKey, ownerKeys)
      )
    );

  const translationsByKeyAndField: Record<string, Record<string, LocalizedField>> = {};

  for (const row of (rows || [])) {
    if (!translationsByKeyAndField[row.ownerKey]) {
      translationsByKeyAndField[row.ownerKey] = {};
    }
    if (!translationsByKeyAndField[row.ownerKey][row.fieldName]) {
      translationsByKeyAndField[row.ownerKey][row.fieldName] = {} as LocalizedField;
    }
    translationsByKeyAndField[row.ownerKey][row.fieldName][row.locale as Locale] = row.value;
  }

  return items.map((item) => {
    const key = idExtractor(item);
    const itemTranslations = translationsByKeyAndField[key] || {};
    const newItem = { ...item };

    for (const { fieldName, objectKey } of fieldsToHydrate) {
      const fieldTranslations = itemTranslations[fieldName] || {};
      
      const fallbackMapping = canonicalFallbacks.find((c) => c.fieldName === fieldName);
      let viValue = fieldTranslations.vi;
      
      if (!viValue && fallbackMapping) {
        viValue = (item[fallbackMapping.objectKey] as unknown as string) || "";
      } else if (!viValue) {
        viValue = "";
      }

      (newItem as any)[objectKey] = {
        vi: viValue,
        en: fieldTranslations.en || "",
      };
    }

    return newItem;
  });
}

/**
 * Hydrates items with their localized fields and resolves them to a single string based on the requested locale.
 */
export async function hydrateAndResolveTranslations<T extends object>(
  db: Database,
  ownerType: OwnerType,
  items: T[],
  idExtractor: (item: T) => string,
  fieldsToHydrate: Array<{ fieldName: string; objectKey: keyof T }>,
  canonicalFallbacks: Array<{ fieldName: string; objectKey: keyof T }> = [],
  locale: Locale
): Promise<T[]> {
  const hydrated = await hydrateTranslations(db, ownerType, items, idExtractor, fieldsToHydrate, canonicalFallbacks);
  
  return hydrated.map(item => {
    const resolvedItem = { ...item };
    for (const { objectKey } of fieldsToHydrate) {
      const locValue = (resolvedItem as any)[objectKey] as Record<Locale, string>;
      if (locValue && typeof locValue === 'object' && ('vi' in locValue || 'en' in locValue)) {
        (resolvedItem as any)[objectKey] = locValue[locale] || locValue.vi || locValue.en || "";
      }
    }
    return resolvedItem;
  });
}
