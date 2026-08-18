import { and, asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { productAssets, productMedia, productVariantCustomizationMedia, productVariantMedia, products } from '../../db/schema'
import { allowedMimeTypes, extensionForMimeType, MAX_ASSET_BYTES } from '../../lib/asset-utils'
import type { AppEnv } from '../../lib/env'
import { readImageDimensions } from '../../lib/image-dimensions'
import { buildCatalogVariantCustomizationBackgroundKey, buildCatalogVariantMediaKey } from '../../lib/r2-media-keys'
import { jsonError, parseParams } from '../../lib/validation'
import { readProduct } from './product-reader'
import { variantParamsSchema } from './product-schemas'

type UploadedMedia = { id: string; fileName: string; mimeType: string; widthPx: number; heightPx: number; byteSize: number; buffer: ArrayBuffer }

async function variantResponse(c: Parameters<typeof readProduct>[0], db: ReturnType<typeof getDb>, productId: number, variantId: number) {
  const product = await readProduct(c, db, productId)
  const variant = product?.variants.find((item) => item.id === variantId)
  if (!variant) return null
  return c.json({ variant }, 200)
}

async function parseFiles(request: Request) {
  const form = await request.formData().catch(() => null)
  if (!form) return { error: 'Multipart form data is required' } as const
  const files = form.getAll('files').filter((value): value is File => value instanceof File)
  if (files.length === 0 || files.length !== [...form.values()].filter((value) => value instanceof File).length) return { error: 'One or more files are required' } as const
  const result: UploadedMedia[] = []
  for (const file of files) {
    const mimeType = file.type.trim().toLowerCase()
    if (!allowedMimeTypes.has(mimeType)) return { error: 'Only PNG, JPEG, WEBP, and PDF product assets are supported' } as const
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return { error: 'Product asset exceeds the 20 MB limit' } as const
    const buffer = await file.arrayBuffer()
    const dimensions = mimeType === 'application/pdf' ? { width: 800, height: 1131 } : readImageDimensions(mimeType, new Uint8Array(buffer))
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) return { error: 'Media data is invalid or unsupported' } as const
    result.push({ id: crypto.randomUUID(), fileName: file.name, mimeType, widthPx: dimensions.width, heightPx: dimensions.height, byteSize: buffer.byteLength, buffer })
  }
  return { files: result } as const
}

export const productVariantMediaManagementRoute = new Hono<AppEnv>()
  .post('/:id/variants/:variantId/media/upload', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const parsedFiles = await parseFiles(c.req.raw)
    if ('error' in parsedFiles) return jsonError(c, 400, parsedFiles.error ?? 'Invalid media upload')
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    const variant = product?.variants.find((item) => item.id === params.output.variantId)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (!variant) return jsonError(c, 404, 'Variant not found')
    const current = await db.select().from(productVariantMedia).where(eq(productVariantMedia.variantId, variant.id)).orderBy(asc(productVariantMedia.position))
    const nextPosition = current.reduce((highest, media) => Math.max(highest, media.position), -1) + 1
    const objectKeys: string[] = []
    try {
      for (const file of parsedFiles.files) {
        const objectKey = buildCatalogVariantMediaKey({ productId: product.id, variantId: variant.id, assetId: file.id, extension: extensionForMimeType(file.mimeType) })
        await c.env.CUSTOMIZATION_ASSETS.put(objectKey, file.buffer, { httpMetadata: { contentType: file.mimeType } })
        objectKeys.push(objectKey)
        await db.insert(productAssets).values({ id: file.id, ownerKey: `catalog:${product.id}`, objectKey, fileName: file.fileName, mimeType: file.mimeType, widthPx: file.widthPx, heightPx: file.heightPx, byteSize: file.byteSize })
        await db.insert(productVariantMedia).values({ variantId: variant.id, assetId: file.id, position: nextPosition + objectKeys.length - 1 })
      }
    } catch (error) {
      await Promise.allSettled(objectKeys.map((key) => c.env.CUSTOMIZATION_ASSETS.delete(key)))
      console.error('variant gallery upload cleanup', { productId: product.id, variantId: variant.id, objectKeys })
      return jsonError(c, 500, error instanceof Error ? error.message : 'Unable to upload variant media')
    }
    return (await variantResponse(c, db, product.id, variant.id)) ?? jsonError(c, 404, 'Variant not found')
  })
  .delete('/:id/variants/:variantId/media/:assetId', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const assetId = c.req.param('assetId')
    const db = getDb(c.env)
    const association = await db.select().from(productVariantMedia).where(and(eq(productVariantMedia.variantId, params.output.variantId), eq(productVariantMedia.assetId, assetId))).get()
    if (!association) return jsonError(c, 404, 'Variant Media not found')
    const asset = await db.select().from(productAssets).where(eq(productAssets.id, assetId)).get()
    if (!asset) return jsonError(c, 404, 'Variant Media asset not found')
    await c.env.CUSTOMIZATION_ASSETS.delete(asset.objectKey)
    await db.delete(productVariantMedia).where(and(eq(productVariantMedia.variantId, params.output.variantId), eq(productVariantMedia.assetId, assetId)))
    await db.delete(productMedia).where(and(eq(productMedia.productId, params.output.id), eq(productMedia.assetId, assetId)))
    await db.delete(productAssets).where(eq(productAssets.id, assetId))
    await db.update(products).set({ thumbnailAssetId: null }).where(and(eq(products.id, params.output.id), eq(products.thumbnailAssetId, assetId)))
    return (await variantResponse(c, db, params.output.id, params.output.variantId)) ?? jsonError(c, 404, 'Variant not found')
  })
  .post('/:id/variants/:variantId/customization-media/replace', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const parsedFiles = await parseFiles(c.req.raw)
    if ('error' in parsedFiles) return jsonError(c, 400, parsedFiles.error ?? 'Invalid Customization Background')
    if (parsedFiles.files.length !== 1) return jsonError(c, 400, 'Exactly one Customization Background file is required')
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    const variant = product?.variants.find((item) => item.id === params.output.variantId)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (!variant) return jsonError(c, 404, 'Variant not found')
    if (!product.customization?.enabled) return jsonError(c, 409, 'Customization is disabled for this product')
    const file = parsedFiles.files[0]
    const sibling = product.variants.find((item) => item.id !== variant.id && item.customizationMedia)?.customizationMedia
    if (sibling && (sibling.widthPx !== file.widthPx || sibling.heightPx !== file.heightPx)) return jsonError(c, 409, `Customization Background must be ${sibling.widthPx} x ${sibling.heightPx} px`)
    const oldAssetId = variant.customizationMedia?.id ?? null
    const objectKey = buildCatalogVariantCustomizationBackgroundKey({ productId: product.id, variantId: variant.id, assetId: file.id, extension: extensionForMimeType(file.mimeType) })
    try {
      await c.env.CUSTOMIZATION_ASSETS.put(objectKey, file.buffer, { httpMetadata: { contentType: file.mimeType } })
      await db.insert(productAssets).values({ id: file.id, ownerKey: `catalog:${product.id}`, objectKey, fileName: file.fileName, mimeType: file.mimeType, widthPx: file.widthPx, heightPx: file.heightPx, byteSize: file.byteSize })
      await db.delete(productVariantCustomizationMedia).where(eq(productVariantCustomizationMedia.variantId, variant.id))
      await db.insert(productVariantCustomizationMedia).values({ variantId: variant.id, assetId: file.id, updatedAt: new Date().toISOString() })
      if (oldAssetId) {
        const oldAsset = await db.select().from(productAssets).where(eq(productAssets.id, oldAssetId)).get()
        if (oldAsset) {
          await c.env.CUSTOMIZATION_ASSETS.delete(oldAsset.objectKey)
          await db.delete(productMedia).where(and(eq(productMedia.productId, product.id), eq(productMedia.assetId, oldAsset.id)))
          await db.delete(productAssets).where(eq(productAssets.id, oldAsset.id))
        }
        await db.update(products).set({ thumbnailAssetId: null }).where(and(eq(products.id, product.id), eq(products.thumbnailAssetId, oldAssetId)))
      }
    } catch (error) {
      await c.env.CUSTOMIZATION_ASSETS.delete(objectKey).catch(() => undefined)
      return jsonError(c, 500, error instanceof Error ? error.message : 'Unable to replace Customization Background')
    }
    return (await variantResponse(c, db, product.id, variant.id)) ?? jsonError(c, 404, 'Variant not found')
  })
