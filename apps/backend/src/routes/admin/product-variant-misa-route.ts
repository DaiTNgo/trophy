import { Hono } from 'hono'
import { getDb } from '../../db/client'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { syncMisaProductVariants } from './product-misa-sync'
import { readProduct } from './product-reader'
import { variantParamsSchema } from './product-schemas'

export const productVariantMisaRoute = new Hono<AppEnv>()
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
