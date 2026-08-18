import { and, eq, inArray } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { getDb } from '../../db/client'
import { productAssets, productMedia, products } from '../../db/schema'
import { allowedMimeTypes, extensionForMimeType, MAX_ASSET_BYTES } from '../../lib/asset-utils'
import type { AppEnv } from '../../lib/env'
import { readImageDimensions } from '../../lib/image-dimensions'
import { buildCatalogProductMediaKey } from '../../lib/r2-media-keys'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { replaceAttributes } from './product-mutations'
import { readProduct } from './product-reader'
import { attributesSchema, idParamsSchema, productListingMediaSchema } from './product-schemas'

async function parseProductMediaFiles(request: Request) {
  const form = await request.formData().catch(() => null)
  if (!form) return { error: 'Multipart form data is required' } as const
  const files = form.getAll('files').filter((value): value is File => value instanceof File)
  if (files.length === 0 || files.length !== [...form.values()].filter((value) => value instanceof File).length) {
    return { error: 'One or more files are required' } as const
  }
  const result: Array<{ id: string; fileName: string; mimeType: string; widthPx: number; heightPx: number; byteSize: number; buffer: ArrayBuffer }> = []
  for (const file of files) {
    const mimeType = file.type.trim().toLowerCase()
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) return { error: 'Only PNG, JPEG, and WEBP images are supported for Listing Media' } as const
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return { error: 'Product asset exceeds the 20 MB limit' } as const
    const buffer = await file.arrayBuffer()
    const dimensions = readImageDimensions(mimeType, new Uint8Array(buffer))
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) return { error: 'Media data is invalid or unsupported' } as const
    result.push({ id: crypto.randomUUID(), fileName: file.name, mimeType, widthPx: dimensions.width, heightPx: dimensions.height, byteSize: buffer.byteLength, buffer })
  }
  return { files: result } as const
}

async function productResponse(c: Context<AppEnv>, db: ReturnType<typeof getDb>, productId: number): Promise<Response> {
  return c.json({ item: await readProduct(c, db, productId) }, 200)
}

export const productContentRoute = new Hono<AppEnv>()
  .put('/:id/attributes', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, attributesSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()
    if (!exists) return jsonError(c, 404, 'Product not found')

    await replaceAttributes(db, params.output.id, parsed.output.items)
    await db
      .update(products)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(products.id, params.output.id))

    return productResponse(c, db, params.output.id)
  })
  .post('/:id/media/upload', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const parsedFiles = await parseProductMediaFiles(c.req.raw)
    if ('error' in parsedFiles) return jsonError(c, 400, parsedFiles.error ?? 'Invalid thumbnail upload')
    if (parsedFiles.files.length !== 1) return jsonError(c, 400, 'Upload exactly one thumbnail file')
    const positionStart = product.media.length
    const writtenKeys: string[] = []
    const insertedAssetIds: string[] = []
    try {
      for (const [offset, file] of parsedFiles.files.entries()) {
        const objectKey = buildCatalogProductMediaKey({ productId: product.id, assetId: file.id, extension: extensionForMimeType(file.mimeType) })
        await c.env.CUSTOMIZATION_ASSETS.put(objectKey, file.buffer, { httpMetadata: { contentType: file.mimeType } })
        writtenKeys.push(objectKey)
        await db.insert(productAssets).values({ id: file.id, ownerKey: `catalog:${product.id}:media`, objectKey, fileName: file.fileName, mimeType: file.mimeType, widthPx: file.widthPx, heightPx: file.heightPx, byteSize: file.byteSize })
        insertedAssetIds.push(file.id)
        await db.insert(productMedia).values({ productId: product.id, assetId: file.id, position: positionStart + offset })
      }
    } catch (error) {
      await Promise.allSettled(writtenKeys.map((key) => c.env.CUSTOMIZATION_ASSETS.delete(key)))
      if (insertedAssetIds.length) await db.delete(productMedia).where(inArray(productMedia.assetId, insertedAssetIds))
      if (insertedAssetIds.length) await db.delete(productAssets).where(inArray(productAssets.id, insertedAssetIds))
      console.error('product media upload failed', { productId: product.id, writtenKeys, insertedAssetIds, error })
      return jsonError(c, 500, 'Unable to upload Product Media')
    }
    return productResponse(c, db, product.id)
  })
  .delete('/:id/media/:assetId', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const assetId = c.req.param('assetId')
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const asset = await db.select().from(productAssets).where(eq(productAssets.id, assetId)).get()
    if (!asset || asset.ownerKey !== `catalog:${product.id}:media`) {
      return jsonError(c, 404, 'Product Media not found')
    }

    try {
      await c.env.CUSTOMIZATION_ASSETS.delete(asset.objectKey)
      await db.batch([
        db.delete(productMedia).where(and(eq(productMedia.productId, product.id), eq(productMedia.assetId, assetId))),
        db.delete(productAssets).where(eq(productAssets.id, assetId)),
        db.update(products).set({ thumbnailAssetId: null }).where(and(eq(products.id, product.id), eq(products.thumbnailAssetId, assetId))),
        db.update(products).set({ hoverAssetId: null }).where(and(eq(products.id, product.id), eq(products.hoverAssetId, assetId))),
      ])
    } catch (error) {
      console.error('product media delete failed', { productId: product.id, assetId, error })
      return jsonError(c, 500, 'Unable to delete Product Media')
    }

    return productResponse(c, db, product.id)
  })
  .put('/:id/listing-media', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const parsed = await parseJson(c, productListingMediaSchema)
    if (!parsed.success) return parsed.response
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const selectedAssetIds = [parsed.output.defaultAssetId, parsed.output.hoverAssetId]
      .filter((assetId): assetId is string => Boolean(assetId))
    const variantAssetIds = new Set(product.variants.flatMap((variant) => [
      ...variant.media.map((media) => media.id),
      ...(variant.customizationMedia ? [variant.customizationMedia.id] : []),
    ]))
    const productAssetIds = new Set(product.media.map((media) => media.assetId))

    for (const assetId of selectedAssetIds) {
      if (!variantAssetIds.has(assetId) && !productAssetIds.has(assetId)) {
        return jsonError(c, 409, 'Listing Media must be a Variant Media, Customization Background, or product-owned media asset')
      }
    }

    const missingProductMediaIds = selectedAssetIds.filter((assetId) => !productAssetIds.has(assetId))
    if (missingProductMediaIds.length) {
      await db.insert(productMedia).values(missingProductMediaIds.map((assetId, index) => ({
        productId: product.id,
        assetId,
        position: product.media.length + index,
      })))
    }

    await db.update(products).set({
      thumbnailAssetId: parsed.output.defaultAssetId ?? null,
      hoverAssetId: parsed.output.hoverAssetId ?? null,
      updatedAt: new Date().toISOString(),
    }).where(eq(products.id, product.id))
    return productResponse(c, db, product.id)
  })
