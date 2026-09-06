import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  catalogTranslations,
  productAssets,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  productVariantAttributes,
  r2CleanupJobs,
  products,
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { extensionForMimeType } from '../../lib/asset-utils'
import { buildCatalogVariantCustomizationBackgroundKey, buildCatalogVariantMediaKey } from '../../lib/r2-media-keys'
import { jsonError, parseParams } from '../../lib/validation'
import { syncMisaProductVariants } from './product-misa-sync'
import { productUsesVariantMode } from './product-publishability'
import { readProduct } from './product-reader'
import { idParamsSchema } from './product-schemas'
import { parseAtomicVariantMultipart } from './product-atomic-variant-multipart'
import { validateVariantSelectionForProduct } from './product-variant-selection'
import { claimProductRevision, hasActiveCustomizationOperation, requireProductRevision } from './product-revision'
import { r2CleanupJobValues } from '../../lib/r2-cleanup-outbox'

const nowIso = () => new Date().toISOString()

const defaultLocalizedText = (value: string) => ({ vi: value, en: value })

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

function translationStatements(
  db: ReturnType<typeof getDb>,
  ownerType: 'product_variant' | 'product_variant_attribute',
  ownerKey: string | ReturnType<typeof sql>,
  fieldName: string,
  values: { vi: string; en?: string | null },
) {
  return (['vi', 'en'] as const).map((locale) =>
    db.insert(catalogTranslations).values({
      ownerType,
      ownerKey: ownerKey as never,
      fieldName,
      locale,
      value: values[locale] ?? '',
    }).onConflictDoUpdate({
      target: [
        catalogTranslations.ownerType,
        catalogTranslations.ownerKey,
        catalogTranslations.fieldName,
        catalogTranslations.locale,
      ],
      set: { value: values[locale] ?? '', updatedAt: sql`CURRENT_TIMESTAMP` },
    }),
  )
}

export const productAtomicVariantCreateRoute = new Hono<AppEnv>().post('/:id/variants/atomic-create', async (c) => {
  const params = parseParams(c, idParamsSchema)
  if (!params.success) return params.response

  const multipart = await parseAtomicVariantMultipart(c.req.raw)
  if (!multipart.success) return jsonError(c, 400, multipart.error)
  const { input, galleryMedia, customizationMedia } = multipart.variant

  const db = getDb(c.env)
  const product = await readProduct(c, db, params.output.id)
  if (!product) return jsonError(c, 404, 'Product not found')
  if (hasActiveCustomizationOperation(product)) {
    return jsonError(c, 409, 'Customization setup is in progress. Reload and try again shortly.')
  }
  const revisionError = requireProductRevision(c, product.updatedAt)
  if (revisionError) return revisionError

  if (!productUsesVariantMode(product) && product.variants.length >= 1) {
    return jsonError(c, 409, 'Define product options before creating multiple variants')
  }

  const optionValueIds = [...new Set(input.optionValueIds ?? [])].sort((a, b) => a - b)
  const selectionError = await validateVariantSelectionForProduct({
    db,
    productId: product.id,
    optionValueIds
  })
  if (selectionError) return jsonError(c, selectionError.status, selectionError.error)

  const customizationActive = Boolean(product.customization?.enabled)
  const expectedCanvas = product.customization && (product.customization.enabled || product.customization.canvasWidthPx)
    ? { widthPx: product.customization.canvasWidthPx, heightPx: product.customization.canvasHeightPx }
    : null

  if (customizationActive && !customizationMedia) {
    return jsonError(c, 409, 'Customization requires a Customization Background for every variant while active')
  }
  if (customizationActive && customizationMedia && expectedCanvas) {
    if (
      (expectedCanvas.widthPx !== null && customizationMedia.widthPx !== expectedCanvas.widthPx) ||
      (expectedCanvas.heightPx !== null && customizationMedia.heightPx !== expectedCanvas.heightPx)
    ) {
      return jsonError(c, 409, 'Customization Media must match the existing canvas size before publish')
    }
  }

  if (product.status === 'published' && input.priceAmount === null) {
    return jsonError(c, 409, 'Every variant must have a price before publish')
  }

  if (!await claimProductRevision(db, product.id, product.updatedAt)) {
    return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
  }

  const writeToken = crypto.randomUUID()
  const variantId = sql<number>`(select ${productVariants.id} from ${productVariants} where ${productVariants.writeToken} = ${writeToken})`
  const writtenObjectKeys: string[] = []
  const assetRows: Array<typeof productAssets.$inferInsert> = []
  try {
    for (const media of galleryMedia) {
      const objectKey = buildCatalogVariantMediaKey({
        productId: product.id,
        variantId: writeToken,
        assetId: media.id,
        extension: extensionForMimeType(media.mimeType)
      })
      await c.env.CUSTOMIZATION_ASSETS.put(objectKey, media.buffer, { httpMetadata: { contentType: media.mimeType } })
      writtenObjectKeys.push(objectKey)
      assetRows.push({
        id: media.id,
        ownerKey: `catalog:${product.id}`,
        objectKey,
        fileName: media.fileName,
        mimeType: media.mimeType,
        widthPx: media.widthPx,
        heightPx: media.heightPx,
        byteSize: media.byteSize
      })
    }

    if (customizationMedia) {
      const objectKey = buildCatalogVariantCustomizationBackgroundKey({
        productId: product.id,
        variantId: writeToken,
        assetId: customizationMedia.id,
        extension: extensionForMimeType(customizationMedia.mimeType)
      })
      await c.env.CUSTOMIZATION_ASSETS.put(objectKey, customizationMedia.buffer, { httpMetadata: { contentType: customizationMedia.mimeType } })
      writtenObjectKeys.push(objectKey)
      let previewObjectKey: string | null = null
      if (customizationMedia.previewBuffer && customizationMedia.previewMimeType) {
        previewObjectKey = `catalog/${product.id}/variants/${writeToken}/customization-background/${customizationMedia.id}/preview.${extensionForMimeType(customizationMedia.previewMimeType)}`
        await c.env.CUSTOMIZATION_ASSETS.put(previewObjectKey, customizationMedia.previewBuffer, { httpMetadata: { contentType: customizationMedia.previewMimeType } })
        writtenObjectKeys.push(previewObjectKey)
      }
      assetRows.push({
        id: customizationMedia.id,
        ownerKey: `catalog:${product.id}`,
        objectKey,
        previewObjectKey,
        fileName: customizationMedia.fileName,
        mimeType: customizationMedia.mimeType,
        widthPx: customizationMedia.widthPx,
        heightPx: customizationMedia.heightPx,
        byteSize: customizationMedia.byteSize
      })
    }

    const attributes = input.attributes ?? []
    const attributeRows = attributes.map((attribute, position) => ({
      writeToken: `${writeToken}_${position}`,
      variantId: variantId as never,
      name: attribute.name.vi,
      value: attribute.value.vi,
      unit: attribute.unit ?? null,
      position,
    }))
    const title = typeof input.title === 'string' ? defaultLocalizedText(input.title) : input.title
    const variantOwnerKey = sql<string>`cast(${variantId} as text)`
    await db.batch([
      db.insert(productVariants).values({
        writeToken,
        productId: product.id,
        title: localizedInputValue(input.title),
        sku: input.sku ?? null,
        priceAmount: input.priceAmount ?? null,
        inventoryQuantity: input.inventoryQuantity ?? 0,
        allowBackorder: input.allowBackorder ?? false,
        isDefault: false,
        position: product.variants.length,
        updatedAt: nowIso(),
      }),
      ...translationStatements(db, 'product_variant', variantOwnerKey, 'title', title),
      ...(optionValueIds.length > 0 ? [db.insert(productVariantOptionValues).values(
        optionValueIds.map((optionValueId) => ({ variantId: variantId as never, optionValueId })),
      )] : []),
      ...(assetRows.length > 0 ? [db.insert(productAssets).values(assetRows)] : []),
      ...(galleryMedia.length > 0 ? [db.insert(productVariantMedia).values(
        galleryMedia.map((media, position) => ({ variantId: variantId as never, assetId: media.id, position })),
      )] : []),
      ...(customizationMedia ? [db.insert(productVariantCustomizationMedia).values({
        variantId: variantId as never,
        assetId: customizationMedia.id,
        updatedAt: nowIso(),
      })] : []),
      ...(attributeRows.length > 0 ? [db.insert(productVariantAttributes).values(attributeRows)] : []),
      ...attributes.flatMap((attribute, position) => {
        const attributeId = sql<number>`(select ${productVariantAttributes.id} from ${productVariantAttributes} where ${productVariantAttributes.writeToken} = ${`${writeToken}_${position}`})`
        const attributeOwnerKey = sql<string>`cast(${attributeId} as text)`
        return [
          ...translationStatements(db, 'product_variant_attribute', attributeOwnerKey, 'name', attribute.name),
          ...translationStatements(db, 'product_variant_attribute', attributeOwnerKey, 'value', attribute.value),
        ]
      }),
      db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id)),
    ] as any)
  } catch (error) {
    const cleanup = await Promise.allSettled(writtenObjectKeys.map((objectKey) => c.env.CUSTOMIZATION_ASSETS.delete(objectKey)))
    const failedObjectKeys = writtenObjectKeys.filter((_, index) => cleanup[index]?.status === 'rejected')
    if (failedObjectKeys.length > 0) {
      await db.insert(r2CleanupJobs).values(r2CleanupJobValues(failedObjectKeys)).catch((cleanupError) => {
        console.error('failed to queue atomic variant compensation', { failedObjectKeys, cleanupError })
      })
    }
    return jsonError(c, 500, error instanceof Error ? error.message : 'Unable to create variant')
  }

  const insertedVariant = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.writeToken, writeToken))
    .get()
  const nextProduct = await readProduct(c, db, product.id)
  if (nextProduct && product.status === 'published' && insertedVariant) {
    const inserted = nextProduct.variants.find((item) => item.id === insertedVariant.id)
    if (inserted) await syncMisaProductVariants(c, db, nextProduct, [inserted])
  }
  const syncedProduct =
    product.status === 'published' ? await readProduct(c, db, product.id) : nextProduct
  return c.json({ item: syncedProduct }, 201)
})
