import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import type { AppBindings } from '../../lib/env'
import {
  buildMisaCreateProductsPayload,
  createMisaProducts,
  findMisaProductsByCodes,
  isMisaConfigured,
  updateMisaProducts
} from '../../lib/misa'
import { productVariants } from '../../db/schema'

type MisaPayloadInput = Parameters<typeof buildMisaCreateProductsPayload>[0]

type MisaSyncVariant = MisaPayloadInput['variants'][number] & {
  id: number
  misaProductId: number | null
  misaSyncStatus: string | null
}

export type MisaSyncProduct = {
  title: MisaPayloadInput['title']
  variants: MisaSyncVariant[]
}

export async function syncMisaProductVariants(
  c: { env: AppBindings },
  db: ReturnType<typeof getDb>,
  product: MisaSyncProduct,
  variants = product.variants
) {
  let payloads: ReturnType<typeof buildMisaCreateProductsPayload>
  try {
    payloads = buildMisaCreateProductsPayload({ title: product.title, variants })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare MISA product payload'
    await Promise.all(
      variants.map((variant) =>
        db
          .update(productVariants)
          .set({ misaSyncStatus: 'failed', misaLastError: message })
          .where(eq(productVariants.id, variant.id))
      )
    )
    return variants.map((variant) => ({ variantId: variant.id, status: 'failed' as const, error: message }))
  }

  if (!isMisaConfigured(c.env)) {
    const message = 'MISA integration is not configured'
    await Promise.all(
      variants.map((variant) =>
        db
          .update(productVariants)
          .set({ misaSyncStatus: 'failed', misaLastError: message })
          .where(eq(productVariants.id, variant.id))
      )
    )
    return variants.map((variant) => ({ variantId: variant.id, status: 'failed' as const, error: message }))
  }

  return Promise.all(
    variants.map(async (variant, index) => {
      const payload = payloads[index]
      try {
        if (variant.misaSyncStatus === 'synced' && variant.misaProductId) {
          await updateMisaProducts(c.env, [payload])
          await db
            .update(productVariants)
            .set({ misaSyncStatus: 'synced', misaLastError: null, misaSyncedAt: new Date() })
            .where(eq(productVariants.id, variant.id))
          return { variantId: variant.id, status: 'synced' as const, error: null }
        }

        await createMisaProducts(c.env, [payload])
        const remoteProducts = await findMisaProductsByCodes(c.env, [payload.product_code])
        const remote = remoteProducts.find((item) => item.product_code === payload.product_code)
        const misaProductId = remote?.id ? Number(remote.id) : NaN
        if (!Number.isInteger(misaProductId) || misaProductId <= 0) {
          throw new Error(`MISA did not return a numeric ID for variant ${variant.id}`)
        }

        await db
          .update(productVariants)
          .set({ misaProductId, misaSyncStatus: 'synced', misaLastError: null, misaSyncedAt: new Date() })
          .where(eq(productVariants.id, variant.id))
        return { variantId: variant.id, status: 'synced' as const, error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to synchronize variant with MISA'
        await db
          .update(productVariants)
          .set({ misaSyncStatus: 'failed', misaLastError: message })
          .where(eq(productVariants.id, variant.id))
        return { variantId: variant.id, status: 'failed' as const, error: message }
      }
    })
  )
}

export function enqueueMisaProductSync(
  c: { env: AppBindings; executionCtx?: { waitUntil(task: Promise<unknown>): void } },
  db: ReturnType<typeof getDb>,
  product: MisaSyncProduct
) {
  const task = syncMisaProductVariants(c, db, product).catch(() => undefined)
  c.executionCtx?.waitUntil(task)
}
