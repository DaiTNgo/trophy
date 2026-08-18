import {
  validateProductCustomizationDraft,
  type ProductCustomization
} from '@trophy/customization'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  catalogTranslations,
  productCategoryLinks,
  productCustomizations,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { prepareCustomizationTranslations } from '../../lib/customization-translation'
import { ensureCustomizationCategory } from '../../lib/customization-category'
import { readProduct } from './product-reader'
import { fullCreateCustomizationSchema, idParamsSchema } from './product-schemas'
import { claimProductRevision, requireProductRevision } from './product-revision'

const nowIso = () => new Date().toISOString()

function translationStatements(db: ReturnType<typeof getDb>, writes: ReturnType<typeof prepareCustomizationTranslations>) {
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
      target: [catalogTranslations.ownerType, catalogTranslations.ownerKey, catalogTranslations.fieldName, catalogTranslations.locale],
      set: { value: value ?? '', updatedAt: sql`CURRENT_TIMESTAMP` },
    })
  }))
}

export const productCustomizationRoute = new Hono<AppEnv>()
  .put('/:id/customization', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, fullCreateCustomizationSchema)
    if (!parsed.success) return parsed.response

    if (!parsed.output.enabled) {
      return jsonError(c, 409, 'Use the customization lifecycle commands to deactivate customization')
    }

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (!product.customization) {
      return jsonError(c, 409, 'Customization is not saved yet; activate Customization Setup first')
    }
    if (!product.customization.enabled) {
      return jsonError(c, 409, 'Reactivate customization before editing its template')
    }

    const draftValidation = validateProductCustomizationDraft({
      layers: parsed.output.layers as ProductCustomization['layers'],
      formFields: parsed.output.formFields as ProductCustomization['formFields']
    })
    if (!draftValidation.valid) {
      return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization is invalid')
    }

    const category = await ensureCustomizationCategory(db)
    const linkedCategory = await db
      .select({ categoryId: productCategoryLinks.categoryId })
      .from(productCategoryLinks)
      .where(and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id)))
      .get()
    const translationWrites = prepareCustomizationTranslations(parsed.output)
    if (!await claimProductRevision(db, product.id, product.updatedAt)) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }
    await db.batch([
      ...translationStatements(db, translationWrites),
      ...(!linkedCategory ? [db.insert(productCategoryLinks).values({ productId: product.id, categoryId: category.id })] : []),
      db.update(productCustomizations).set({
        layersJson: JSON.stringify(parsed.output.layers),
        formFieldsJson: JSON.stringify(parsed.output.formFields),
        updatedAt: nowIso(),
      }).where(eq(productCustomizations.productId, product.id)),
      db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id)),
    ] as any)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
