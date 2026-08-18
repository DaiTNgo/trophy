import {
  validateProductCustomizationDraft,
  type ProductCustomization
} from '@trophy/customization'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  catalogTranslations,
  productAssets,
  productCategories,
  productCategoryLinks,
  productCustomizations,
  productMedia,
  productVariantCustomizationMedia,
  r2CleanupJobs,
  products,
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { extensionForMimeType } from '../../lib/asset-utils'
import { prepareCustomizationTranslations } from '../../lib/customization-translation'
import { r2CleanupJobValues } from '../../lib/r2-cleanup-outbox'
import { buildCatalogVariantCustomizationBackgroundKey } from '../../lib/r2-media-keys'
import { jsonError, parseParams } from '../../lib/validation'
import {
  CUSTOMIZATION_CATEGORY_HANDLE,
  ensureCustomizationCategory
} from '../../lib/customization-category'
import {
  collectCustomizationTranslationKeys,
  deriveCustomizationLifecycle,
  validateBackgroundSizeContract
} from './product-customization-service'
import {
  parseCustomizationActivationMultipart,
  parseCustomizationRepairMultipart,
} from './product-customization-multipart'
import { readProduct } from './product-reader'
import { idParamsSchema } from './product-schemas'
import {
  claimCustomizationOperation,
  claimProductRevision,
  refreshCustomizationOperation,
  releaseCustomizationOperation,
  requireProductRevision,
} from './product-revision'

const nowIso = () => new Date().toISOString()

function customizationTranslationStatements(
  db: ReturnType<typeof getDb>,
  writes: ReturnType<typeof prepareCustomizationTranslations>,
) {
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

export const productCustomizationLifecycleRoute = new Hono<AppEnv>()
  .post('/:id/customization/activate', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (product.customization) {
      return jsonError(c, 409, 'Customization is already saved for this product')
    }

    if (product.variants.length === 0) {
      return jsonError(c, 409, 'Product requires at least one Variant before customization can be activated')
    }

    const variantIds = product.variants.map((variant) => variant.id)
    const multipart = await parseCustomizationActivationMultipart(c.req.raw, variantIds)
    if (!multipart.success) return jsonError(c, 400, multipart.error)
    const { template, backgrounds } = multipart.input

    const draftValidation = validateProductCustomizationDraft({
      layers: template.layers as ProductCustomization['layers'],
      formFields: template.formFields as ProductCustomization['formFields']
    })
    if (!draftValidation.valid) {
      return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization template is invalid')
    }

    const sizeError = validateBackgroundSizeContract(backgrounds)
    if (sizeError) return jsonError(c, 409, sizeError)

    const first = backgrounds[0]
    const canvasWidthPx = first?.widthPx ?? null
    const canvasHeightPx = first?.heightPx ?? null

    const operationToken = await claimCustomizationOperation(db, product.id, product.updatedAt)
    if (!operationToken) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const category = await ensureCustomizationCategory(db)
    const linkedCategory = await db
      .select().from(productCategoryLinks)
      .where(and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id)))
      .get()
    const writtenObjectKeys: string[] = []
    const assetRows: Array<typeof productAssets.$inferInsert> = []
    const translationWrites = prepareCustomizationTranslations(template)
    try {
      for (const background of backgrounds) {
        const assetId = background.id
        const objectKey = buildCatalogVariantCustomizationBackgroundKey({
          productId: product.id,
          variantId: background.variantId,
          assetId,
          extension: extensionForMimeType(background.mimeType)
        })
        await c.env.CUSTOMIZATION_ASSETS.put(objectKey, background.buffer, { httpMetadata: { contentType: background.mimeType } })
        writtenObjectKeys.push(objectKey)
        assetRows.push({
          id: assetId,
          ownerKey: `catalog:${product.id}`,
          objectKey,
          fileName: background.fileName,
          mimeType: background.mimeType,
          widthPx: background.widthPx,
          heightPx: background.heightPx,
          byteSize: background.byteSize
        })
      }
      if (!await refreshCustomizationOperation(db, product.id, operationToken)) {
        throw new Error('Customization operation lease expired before activation could be saved')
      }
      await db.batch([
        ...customizationTranslationStatements(db, translationWrites),
        db.insert(productAssets).values(assetRows),
        db.insert(productVariantCustomizationMedia).values(backgrounds.map((background) => ({
          variantId: background.variantId,
          assetId: background.id,
          updatedAt: nowIso(),
        }))),
        ...(!linkedCategory ? [db.insert(productCategoryLinks).values({ productId: product.id, categoryId: category.id })] : []),
        db.insert(productCustomizations).values({
          productId: product.id,
          enabled: true,
          canvasWidthPx,
          canvasHeightPx,
          layersJson: JSON.stringify(template.layers),
          formFieldsJson: JSON.stringify(template.formFields),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }),
        db.update(products).set({
          updatedAt: nowIso(),
          ...releaseCustomizationOperation(),
        }).where(and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken))),
      ] as any)
    } catch (error) {
      try {
        await db.update(products).set(releaseCustomizationOperation()).where(
          and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken))
        )
      } catch {}
      const cleanup = await Promise.allSettled(writtenObjectKeys.map((objectKey) => c.env.CUSTOMIZATION_ASSETS.delete(objectKey)))
      const failedObjectKeys = writtenObjectKeys.filter((_, index) => cleanup[index]?.status === 'rejected')
      if (failedObjectKeys.length > 0) {
        await db.insert(r2CleanupJobs).values(r2CleanupJobValues(failedObjectKeys)).catch((cleanupError) => {
          console.error('failed to queue activation compensation', { failedObjectKeys, cleanupError })
        })
      }
      return jsonError(c, 500, error instanceof Error ? error.message : 'Unable to activate customization')
    }

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .post('/:id/customization/deactivate', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (!product.customization) return jsonError(c, 409, 'Customization is not saved for this product')
    if (!product.customization.enabled) return jsonError(c, 409, 'Customization is already deactivated')

    if (!await claimProductRevision(db, product.id, product.updatedAt)) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const category = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.handle, CUSTOMIZATION_CATEGORY_HANDLE))
      .get()
    if (category) {
      await db.batch([
        db.update(productCustomizations).set({ enabled: false, updatedAt: nowIso() }).where(eq(productCustomizations.productId, product.id)),
        db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id)),
        db.delete(productCategoryLinks).where(
          and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id))
        ),
      ] as any)
    } else {
      await db.batch([
        db.update(productCustomizations).set({ enabled: false, updatedAt: nowIso() }).where(eq(productCustomizations.productId, product.id)),
        db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id)),
      ] as any)
    }

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .post('/:id/customization/reactivate', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (!product.customization) return jsonError(c, 409, 'Customization is not saved for this product')
    if (product.customization.enabled) return jsonError(c, 409, 'Customization is already active')

    const lifecycle = deriveCustomizationLifecycle(product)
    if (lifecycle.missingBackgroundVariantIds.length > 0) {
      return c.json({
        error: 'Customization requires backgrounds for variants added while inactive',
        missingBackgroundVariantIds: lifecycle.missingBackgroundVariantIds
      }, 409 as 400 | 404 | 409 | 422)
    }

    const operationToken = await claimCustomizationOperation(db, product.id, product.updatedAt)
    if (!operationToken) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const category = await ensureCustomizationCategory(db)
    const linkedCategory = await db
      .select({ categoryId: productCategoryLinks.categoryId })
      .from(productCategoryLinks)
      .where(and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id)))
      .get()
    await db.batch([
      db.update(productCustomizations).set({ enabled: true, updatedAt: nowIso() }).where(eq(productCustomizations.productId, product.id)),
      db.update(products).set({
        updatedAt: nowIso(),
        ...releaseCustomizationOperation(),
      }).where(and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken))),
      ...(!linkedCategory ? [db.insert(productCategoryLinks).values({ productId: product.id, categoryId: category.id })] : []),
    ] as any)

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .post('/:id/customization/repair', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (!product.customization) return jsonError(c, 409, 'Customization is not saved for this product')
    if (product.customization.enabled) return jsonError(c, 409, 'Customization is already active')

    const lifecycle = deriveCustomizationLifecycle(product)
    const missingVariantIds = lifecycle.missingBackgroundVariantIds
    if (missingVariantIds.length === 0) {
      return jsonError(c, 409, 'Customization has no missing Customization Backgrounds')
    }

    const multipart = await parseCustomizationRepairMultipart(c.req.raw, missingVariantIds)
    if (!multipart.success) return jsonError(c, 400, multipart.error)
    const draftValidation = validateProductCustomizationDraft({
      layers: multipart.input.template.layers as ProductCustomization['layers'],
      formFields: multipart.input.template.formFields as ProductCustomization['formFields'],
    })
    if (!draftValidation.valid) {
      return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization template is invalid')
    }

    const canvasWidthPx = lifecycle.canvasWidthPx
    const canvasHeightPx = lifecycle.canvasHeightPx
    for (const background of multipart.input.backgrounds) {
      if (
        !canvasWidthPx || !canvasHeightPx ||
        background.widthPx !== canvasWidthPx ||
        background.heightPx !== canvasHeightPx
      ) {
        return jsonError(c, 409, 'Customization Backgrounds must match the saved canvas size')
      }
    }

    const operationToken = await claimCustomizationOperation(db, product.id, product.updatedAt)
    if (!operationToken) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const previousAssociations = await Promise.all(
      multipart.input.backgrounds.map(async (background) => ({
        variantId: background.variantId,
        association: await db
          .select()
          .from(productVariantCustomizationMedia)
          .where(eq(productVariantCustomizationMedia.variantId, background.variantId))
          .get(),
      })),
    )
    const previousAssetIds = previousAssociations.flatMap(({ association }) => association ? [association.assetId] : [])
    const previousAssets = previousAssetIds.length > 0
      ? await db.select().from(productAssets).where(inArray(productAssets.id, previousAssetIds))
      : []
    const category = await ensureCustomizationCategory(db)
    const linkedCategory = await db
      .select({ categoryId: productCategoryLinks.categoryId })
      .from(productCategoryLinks)
      .where(and(eq(productCategoryLinks.productId, product.id), eq(productCategoryLinks.categoryId, category.id)))
      .get()
    const writtenObjectKeys: string[] = []
    const assetRows: Array<typeof productAssets.$inferInsert> = []
    const previousTranslationKeys = collectCustomizationTranslationKeys({
      layersJson: product.customization.layersJson,
      formFieldsJson: product.customization.formFieldsJson,
    })
    const translationWrites = prepareCustomizationTranslations(multipart.input.template)
    const submittedTranslationKeys = collectCustomizationTranslationKeys({
      layersJson: JSON.stringify(multipart.input.template.layers),
      formFieldsJson: JSON.stringify(multipart.input.template.formFields),
    })
    const obsoleteTranslationKeys = previousTranslationKeys.filter((key) => !submittedTranslationKeys.includes(key))
    try {
      for (const background of multipart.input.backgrounds) {
        const assetId = background.id
        const objectKey = buildCatalogVariantCustomizationBackgroundKey({
          productId: product.id,
          variantId: background.variantId,
          assetId,
          extension: extensionForMimeType(background.mimeType)
        })
        await c.env.CUSTOMIZATION_ASSETS.put(objectKey, background.buffer, { httpMetadata: { contentType: background.mimeType } })
        writtenObjectKeys.push(objectKey)
        assetRows.push({
          id: assetId,
          ownerKey: `catalog:${product.id}`,
          objectKey,
          fileName: background.fileName,
          mimeType: background.mimeType,
          widthPx: background.widthPx,
          heightPx: background.heightPx,
          byteSize: background.byteSize
        })
      }
      if (!await refreshCustomizationOperation(db, product.id, operationToken)) {
        throw new Error('Customization operation lease expired before repair could be saved')
      }
      await db.batch([
        ...customizationTranslationStatements(db, translationWrites),
        db.insert(productAssets).values(assetRows),
        ...multipart.input.backgrounds.map((background) =>
          db.delete(productVariantCustomizationMedia).where(eq(productVariantCustomizationMedia.variantId, background.variantId))
        ),
        db.insert(productVariantCustomizationMedia).values(
          multipart.input.backgrounds.map((background) => ({
            variantId: background.variantId,
            assetId: background.id,
            updatedAt: nowIso(),
          })),
        ),
        ...(previousAssetIds.length > 0 ? [
          db.delete(productMedia).where(and(eq(productMedia.productId, product.id), inArray(productMedia.assetId, previousAssetIds))),
          db.delete(productAssets).where(inArray(productAssets.id, previousAssetIds)),
          db.update(products).set({
            thumbnailAssetId: null,
          }).where(
            and(
              eq(products.id, product.id),
              inArray(products.thumbnailAssetId, previousAssetIds),
            )
          ),
          db.update(products).set({
            updatedAt: nowIso(),
            ...releaseCustomizationOperation(),
          }).where(and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken))),
        ] : [db.update(products).set({
          updatedAt: nowIso(),
          ...releaseCustomizationOperation(),
        }).where(and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken)))]),
        db.update(productCustomizations).set({
          enabled: true,
          layersJson: JSON.stringify(multipart.input.template.layers),
          formFieldsJson: JSON.stringify(multipart.input.template.formFields),
          updatedAt: nowIso(),
        }).where(eq(productCustomizations.productId, product.id)),
        ...(obsoleteTranslationKeys.length > 0 ? [db.delete(catalogTranslations).where(and(
          inArray(catalogTranslations.ownerType, ['customization_form_field', 'customization_layer']),
          inArray(catalogTranslations.ownerKey, obsoleteTranslationKeys),
        ))] : []),
        ...(!linkedCategory ? [db.insert(productCategoryLinks).values({ productId: product.id, categoryId: category.id })] : []),
        ...(previousAssets.length > 0 ? [db.insert(r2CleanupJobs).values(r2CleanupJobValues(previousAssets.map((asset) => asset.objectKey)))] : []),
      ] as any)
    } catch (error) {
      try {
        await db.update(products).set(releaseCustomizationOperation()).where(
          and(eq(products.id, product.id), eq(products.customizationOperationToken, operationToken))
        )
      } catch {}
      const cleanup = await Promise.allSettled(writtenObjectKeys.map((objectKey) => c.env.CUSTOMIZATION_ASSETS.delete(objectKey)))
      const failedObjectKeys = writtenObjectKeys.filter((_, index) => cleanup[index]?.status === 'rejected')
      if (failedObjectKeys.length > 0) {
        await db.insert(r2CleanupJobs).values(r2CleanupJobValues(failedObjectKeys)).catch((cleanupError) => {
          console.error('failed to queue activation repair compensation', { failedObjectKeys, cleanupError })
        })
      }
      return jsonError(c, 500, error instanceof Error ? error.message : 'Unable to repair customization')
    }

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .delete('/:id/customization/permanent', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    if (!product.customization) return jsonError(c, 404, 'Customization not found')
    if (product.customization.enabled) return jsonError(c, 409, 'Deactivate customization before permanent deletion')

    const savedRow = await db
      .select()
      .from(productCustomizations)
      .where(eq(productCustomizations.productId, product.id))
      .get()
    if (!savedRow) return jsonError(c, 404, 'Customization not found')

    const backgroundRows = await db
      .select()
      .from(productVariantCustomizationMedia)
      .where(
        inArray(
          productVariantCustomizationMedia.variantId,
          product.variants.map((variant) => variant.id)
        )
      )
    const backgroundAssetIds = backgroundRows.map((row) => row.assetId)
    const storedAssets = backgroundAssetIds.length > 0
      ? await db.select().from(productAssets).where(inArray(productAssets.id, backgroundAssetIds))
      : []
    const backgroundObjectKeys = storedAssets.map((asset) => asset.objectKey)

    if (!await claimProductRevision(db, product.id, product.updatedAt)) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const translationKeys = collectCustomizationTranslationKeys({
      layersJson: savedRow.layersJson,
      formFieldsJson: savedRow.formFieldsJson
    })
    const category = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.handle, CUSTOMIZATION_CATEGORY_HANDLE))
      .get()
    const variantIds = product.variants.map((variant) => variant.id)
    const statements = [
      ...(variantIds.length > 0
        ? [db.delete(productVariantCustomizationMedia).where(inArray(productVariantCustomizationMedia.variantId, variantIds))]
        : []),
      ...(backgroundAssetIds.length > 0
        ? [
            db.delete(productMedia).where(and(eq(productMedia.productId, product.id), inArray(productMedia.assetId, backgroundAssetIds))),
            db.delete(productAssets).where(inArray(productAssets.id, backgroundAssetIds)),
            db.update(products).set({ thumbnailAssetId: null, updatedAt: nowIso() }).where(
              and(eq(products.id, product.id), inArray(products.thumbnailAssetId, backgroundAssetIds))
            ),
          ]
        : [db.update(products).set({ updatedAt: nowIso() }).where(eq(products.id, product.id))]),
      ...(translationKeys.length > 0
        ? [db.delete(catalogTranslations).where(
            and(
              inArray(catalogTranslations.ownerType, ['customization_form_field', 'customization_layer']),
              inArray(catalogTranslations.ownerKey, translationKeys)
            )
          )]
        : []),
      ...(category
        ? [db.delete(productCategoryLinks).where(
            and(
              eq(productCategoryLinks.productId, product.id),
              eq(productCategoryLinks.categoryId, category.id)
            )
          )]
        : []),
      db.delete(productCustomizations).where(eq(productCustomizations.productId, product.id)),
      ...(backgroundObjectKeys.length > 0
        ? [db.insert(r2CleanupJobs).values(r2CleanupJobValues(backgroundObjectKeys))]
        : []),
    ]
    await db.batch(statements as any)

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
