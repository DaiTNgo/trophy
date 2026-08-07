import { validateProductCustomizationDraft, type ProductCustomization } from '@trophy/customization'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  productCategories,
  productCategoryLinks,
  productCustomizations,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { persistCustomizationTranslations } from '../../lib/customization-translation'
import {
  CUSTOMIZATION_CATEGORY_HANDLE,
  ensureCustomizationCategory
} from '../../lib/customization-category'
import { validatePublishable } from './product-publishability'
import { readProduct } from './product-reader'
import { fullCreateCustomizationSchema, idParamsSchema } from './product-schemas'

const nowIso = () => new Date().toISOString()

export const productCustomizationRoute = new Hono<AppEnv>()
  .put('/:id/customization', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, fullCreateCustomizationSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    let canvasWidthPx: number | null = null
    let canvasHeightPx: number | null = null
    if (parsed.output.enabled) {
      const firstMedia = product.variants.find((variant) => variant.customizationMedia)?.customizationMedia
      if (firstMedia?.widthPx && firstMedia?.heightPx) {
        canvasWidthPx = firstMedia.widthPx
        canvasHeightPx = firstMedia.heightPx
      }
      const draftValidation = validateProductCustomizationDraft({
        layers: parsed.output.layers as ProductCustomization['layers'],
        formFields: parsed.output.formFields as ProductCustomization['formFields']
      })
      if (!draftValidation.valid) {
        return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization is invalid')
      }
    }

    if (product.status === 'published' && parsed.output.enabled) {
      const publishError = validatePublishable({
        ...product,
        customization: {
          productId: String(product.id),
          enabled: true,
          canvasWidthPx,
          canvasHeightPx,
          layers: parsed.output.layers,
          formFields: parsed.output.formFields,
          layerCount: parsed.output.layers.length,
          formFieldCount: parsed.output.formFields.length
        }
      } as any)
      if (publishError) return jsonError(c, 409, publishError)
    }

    await db.delete(productCustomizations).where(eq(productCustomizations.productId, product.id))
    if (parsed.output.enabled) {
      const category = await ensureCustomizationCategory(db)
      const linkedCategory = await db
        .select({ categoryId: productCategoryLinks.categoryId })
        .from(productCategoryLinks)
        .where(and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id)))
        .get()
      if (!linkedCategory) {
        await db.insert(productCategoryLinks).values({ productId: product.id, categoryId: category.id })
      }
      await persistCustomizationTranslations(db, parsed.output)
      await db.insert(productCustomizations).values({
        productId: product.id,
        enabled: true,
        canvasWidthPx,
        canvasHeightPx,
        layersJson: JSON.stringify(parsed.output.layers),
        formFieldsJson: JSON.stringify(parsed.output.formFields),
        createdAt: nowIso(),
        updatedAt: nowIso()
      })
    } else {
      const category = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(eq(productCategories.handle, CUSTOMIZATION_CATEGORY_HANDLE))
        .get()
      if (category) {
        await db.delete(productCategoryLinks).where(
          and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id))
        )
      }
    }

    await db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id))
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
