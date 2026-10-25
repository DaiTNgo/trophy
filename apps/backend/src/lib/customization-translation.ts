import { and, eq, sql } from 'drizzle-orm'
import { hydrateTranslations, upsertTranslations, hydrateAndResolveTranslations } from './catalog-translation'
import type { Locale } from './locale'
import type { Database } from '../db/client'
import { catalogTranslations } from '../db/schema'

export type CustomizationTranslationWrite = {
  ownerType: 'customization_form_field' | 'customization_layer'
  ownerKey: string
  fieldName: 'label' | 'helpText' | 'placeholder'
  values: Record<string, string | null | undefined>
}

const FORM_FIELD_TRANSLATED_FIELDS = ['label', 'helpText', 'placeholder'] as const
const FORM_FIELD_HYDRATION = FORM_FIELD_TRANSLATED_FIELDS.map((fieldName) => ({ fieldName, objectKey: fieldName }))
const OPTION_HYDRATION = [{ fieldName: 'label', objectKey: 'label' }]

/**
 * Shopper-selectable color/font options of text layers, with the translation owner key
 * each option's label is stored under (`<layerId>:color:<value>` / `<layerId>:font:<value>`).
 */
function selectableTextOptions(customization: any): Array<{ ownerKey: string; option: any }> {
  const options: Array<{ ownerKey: string; option: any }> = []
  for (const layer of customization?.layers ?? []) {
    if (layer.type !== 'text') continue
    for (const kind of ['color', 'font'] as const) {
      const policy = kind === 'color' ? layer.text.colorPolicy : layer.text.fontPolicy
      if (policy?.mode !== 'shopper_selectable') continue
      for (const option of policy.options) {
        options.push({ ownerKey: `${layer.id}:${kind}:${option.value}`, option })
      }
    }
  }
  return options
}

/**
 * Converts localized editor values to their stored Vietnamese values and
 * returns the translation mutations for the caller's enclosing D1 batch.
 */
export function prepareCustomizationTranslations(customization: any): CustomizationTranslationWrite[] {
  const writes: CustomizationTranslationWrite[] = []
  const collect = (
    ownerType: CustomizationTranslationWrite['ownerType'],
    ownerKey: string,
    fieldName: CustomizationTranslationWrite['fieldName'],
    target: Record<string, unknown>,
  ) => {
    const value = target[fieldName]
    if (!value || typeof value !== 'object' || !('vi' in value)) return
    const values = value as Record<string, string | null | undefined>
    writes.push({ ownerType, ownerKey, fieldName, values })
    target[fieldName] = values.vi ?? null
  }

  for (const field of customization?.formFields ?? []) {
    for (const fieldName of FORM_FIELD_TRANSLATED_FIELDS) {
      collect('customization_form_field', String(field.id), fieldName, field)
    }
  }

  for (const { ownerKey, option } of selectableTextOptions(customization)) {
    collect('customization_layer', ownerKey, 'label', option)
  }

  return writes
}

/** Batch statements applying translation writes: null deletes a locale, anything else upserts it. */
export function customizationTranslationStatements(db: Database, writes: CustomizationTranslationWrite[]) {
  return writes.flatMap((write) => ['vi', 'en'].map((locale) => {
    const value = write.values[locale]
    if (value === null) {
      return db.delete(catalogTranslations).where(and(
        eq(catalogTranslations.ownerType, write.ownerType),
        eq(catalogTranslations.ownerKey, write.ownerKey),
        eq(catalogTranslations.fieldName, write.fieldName),
        eq(catalogTranslations.locale, locale),
      ))
    }
    return db.insert(catalogTranslations).values({
      ownerType: write.ownerType,
      ownerKey: write.ownerKey,
      fieldName: write.fieldName,
      locale,
      value: value ?? '',
    }).onConflictDoUpdate({
      target: [
        catalogTranslations.ownerType,
        catalogTranslations.ownerKey,
        catalogTranslations.fieldName,
        catalogTranslations.locale,
      ],
      set: { value: value ?? '', updatedAt: sql`CURRENT_TIMESTAMP` },
    })
  }))
}

type HydrateFn = (
  ownerType: CustomizationTranslationWrite['ownerType'],
  items: any[],
  idExtractor: (item: any) => string,
  fields: Array<{ fieldName: string; objectKey: string }>,
) => Promise<unknown>

async function hydrateCustomizationWith(customization: any, hydrate: HydrateFn) {
  if (!customization) return

  if (customization.formFields?.length > 0) {
    await hydrate('customization_form_field', customization.formFields, (f) => String(f.id), FORM_FIELD_HYDRATION)
  }

  const selectable = selectableTextOptions(customization)
  if (selectable.length > 0) {
    const ownerKeys = new Map(selectable.map(({ ownerKey, option }) => [option, ownerKey]))
    await hydrate('customization_layer', selectable.map(({ option }) => option), (o) => ownerKeys.get(o)!, OPTION_HYDRATION)
  }
}

export async function hydrateCustomization(db: Database, customization: any) {
  await hydrateCustomizationWith(customization, (ownerType, items, idExtractor, fields) =>
    hydrateTranslations(db, ownerType, items, idExtractor, fields, fields),
  )
}

export async function hydrateAndResolveCustomization(db: Database, customization: any, locale: Locale) {
  await hydrateCustomizationWith(customization, (ownerType, items, idExtractor, fields) =>
    hydrateAndResolveTranslations(db, ownerType, items, idExtractor, fields, fields, locale),
  )
}

export async function persistCustomizationTranslations(db: Database, customization: any) {
  if (!customization) return

  for (const field of customization.formFields ?? []) {
    if (field.label && typeof field.label === 'object' && field.label.vi !== undefined) {
      await upsertTranslations(db, 'customization_form_field', String(field.id), 'label', field.label)
      field.label = field.label.vi
    }
    for (const fieldName of ['helpText', 'placeholder'] as const) {
      const value = field[fieldName]
      if (value && typeof value === 'object' && value.vi !== undefined) {
        await upsertTranslations(db, 'customization_form_field', String(field.id), fieldName, value)
        field[fieldName] = value.vi || null
      }
    }
  }

  for (const { ownerKey, option } of selectableTextOptions(customization)) {
    if (option.label && typeof option.label === 'object' && option.label.vi !== undefined) {
      await upsertTranslations(db, 'customization_layer', ownerKey, 'label', option.label)
      option.label = option.label.vi
    }
  }
}
