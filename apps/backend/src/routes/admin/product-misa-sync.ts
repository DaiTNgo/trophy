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
  misaProductCode: string | null
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
            .set({ misaProductCode: payload.product_code, misaSyncStatus: 'synced', misaLastError: null, misaSyncedAt: new Date() })
            .where(eq(productVariants.id, variant.id))
          return { variantId: variant.id, status: 'synced' as const, error: null }
        }

        const candidateCodes = [payload.product_code, ...Array.from({ length: 98 }, (_, index) => `${variant.id}-R${index + 2}`)]
        let linked: { id: number; code: string } | null = null
        for (const code of candidateCodes) {
          const candidate = { ...payload, product_code: code }
          try {
            await createMisaProducts(c.env, [candidate])
          } catch (createError) {
            if (!/trùng|duplicate|product_code/i.test(createError instanceof Error ? createError.message : '')) throw createError
          }
          const created = (await findMisaProductsByCodes(c.env, [code]))
            .find((product) => product.product_code === code)
          if (created?.id) {
            const id = Number(created.id)
            if (Number.isInteger(id) && id > 0) {
              linked = { id, code }
              break
            }
          }
        }
        if (!linked) throw new Error(`MISA could not create or reconnect variant ${variant.id}`)

        await db
          .update(productVariants)
          .set({ misaProductId: linked.id, misaProductCode: linked.code, misaSyncStatus: 'synced', misaLastError: null, misaSyncedAt: new Date() })
          .where(eq(productVariants.id, variant.id))
        return { variantId: variant.id, status: 'synced' as const, error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to synchronize variant with MISA'
        console.error('MISA Product synchronization failed', {
          variantId: variant.id,
          productCode: payload.product_code,
          misaProductId: variant.misaProductId,
          message,
        })
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
