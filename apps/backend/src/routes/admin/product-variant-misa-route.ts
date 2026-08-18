import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { productVariants } from '../../db/schema'
import { getAdminSession } from '../../lib/admin-session'
import { eq } from 'drizzle-orm'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { syncMisaProductVariants } from './product-misa-sync'
import { findMisaProductsByCodes, isMisaConfigured } from '../../lib/misa'
import { readProduct } from './product-reader'
import { variantParamsSchema } from './product-schemas'

export const productVariantMisaRoute = new Hono<AppEnv>()
  .post('/:id/misa-check', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) return jsonError(c, 400, 'Invalid product ID')
    const db = getDb(c.env)
    const product = await readProduct(c, db, id)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (isMisaConfigured(c.env)) {
      const variants = product.variants.filter((variant) => variant.misaSyncStatus === 'synced' && variant.misaProductId)
      try {
        const codes = variants.map((variant) => variant.misaProductCode ?? String(variant.id))
        const remote = await findMisaProductsByCodes(c.env, codes)
        await Promise.all(variants.map((variant) => {
          const code = variant.misaProductCode ?? String(variant.id)
          const found = remote.find((item) => item.product_code === code)
          const remoteId = found?.id ? Number(found.id) : NaN
          return db.update(productVariants).set(Number.isInteger(remoteId) && remoteId > 0
            ? { misaProductId: remoteId, misaProductCode: code, misaSyncStatus: 'synced', misaLastError: null }
            : { misaSyncStatus: 'missing', misaLastError: 'MISA Product no longer exists' },
          ).where(eq(productVariants.id, variant.id))
        }))
      } catch (error) {
        await Promise.all(variants.map((variant) => db.update(productVariants).set({ misaLastError: error instanceof Error ? error.message : 'MISA presence check failed' }).where(eq(productVariants.id, variant.id))))
      }
    }
    const checked = await readProduct(c, db, id)
    return c.json({ variants: checked?.variants.map((variant) => ({
      id: variant.id,
      misaProductId: variant.misaProductId,
      misaProductCode: variant.misaProductCode,
      misaSyncStatus: variant.misaSyncStatus,
      misaLastError: variant.misaLastError,
    })) ?? [] }, 200)
  })
  .post('/:id/variants/:variantId/misa-sync', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (product.status !== 'published') {
      return jsonError(c, 409, 'Only published product variants can be synchronized with MISA')
    }

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')

    const [sync] = await syncMisaProductVariants(c, db, product, [variant])
    return c.json({ item: await readProduct(c, db, product.id), sync }, 200)
  })
  .post('/:id/variants/:variantId/misa-disconnect', async (c) => {
    const session = await getAdminSession(c.env, c.req.raw.headers)
    if ((session?.user as { role?: string } | undefined)?.role !== 'super-admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')
    await db.update(productVariants).set({
      misaProductId: null,
      misaProductCode: null,
      misaSyncStatus: 'disconnected',
      misaLastError: null,
    }).where(eq(productVariants.id, variant.id))
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
