import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Database } from '../../db/client'
import { products } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError } from '../../lib/validation'

export function requireProductRevision(
  c: Context<AppEnv>,
  actualRevision: string,
) {
  const expectedRevision = c.req.header('if-match')
  if (!expectedRevision) {
    return jsonError(c, 400, 'Product revision is required')
  }
  if (expectedRevision !== actualRevision) {
    return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
  }
  return null
}

/**
 * Claims the revision at the D1 write boundary. A request that read the same
 * revision as another request loses here before it can write R2 or related D1
 * rows.
 */
export async function claimProductRevision(
  db: Database,
  productId: number,
  expectedRevision: string,
) {
  const claimed = await db
    .update(products)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(products.id, productId), eq(products.updatedAt, expectedRevision)))
    .returning({ id: products.id })
    .get()
  return claimed !== null
}

const CUSTOMIZATION_OPERATION_LEASE_MS = 5 * 60 * 1000

export function hasActiveCustomizationOperation(product: {
  customizationOperationToken?: string | null
  customizationOperationExpiresAt?: string | null
}) {
  return Boolean(
    product.customizationOperationToken &&
    product.customizationOperationExpiresAt &&
    new Date(product.customizationOperationExpiresAt).getTime() > Date.now(),
  )
}

export async function claimCustomizationOperation(
  db: Database,
  productId: number,
  expectedRevision: string,
) {
  const token = crypto.randomUUID()
  const now = new Date()
  const claimed = await db
    .update(products)
    .set({
      updatedAt: now.toISOString(),
      customizationOperationToken: token,
      customizationOperationExpiresAt: new Date(now.getTime() + CUSTOMIZATION_OPERATION_LEASE_MS).toISOString(),
    })
    .where(and(
      eq(products.id, productId),
      eq(products.updatedAt, expectedRevision),
      or(
        isNull(products.customizationOperationExpiresAt),
        lte(products.customizationOperationExpiresAt, now.toISOString()),
      ),
    ))
    .returning({ id: products.id })
    .get()
  return claimed ? token : null
}

export async function refreshCustomizationOperation(
  db: Database,
  productId: number,
  token: string,
) {
  const now = new Date()
  const refreshed = await db
    .update(products)
    .set({ customizationOperationExpiresAt: new Date(now.getTime() + CUSTOMIZATION_OPERATION_LEASE_MS).toISOString() })
    .where(and(
      eq(products.id, productId),
      eq(products.customizationOperationToken, token),
      gte(products.customizationOperationExpiresAt, now.toISOString()),
    ))
    .returning({ id: products.id })
    .get()
  return refreshed !== null
}

export function releaseCustomizationOperation() {
  return {
    customizationOperationToken: null,
    customizationOperationExpiresAt: null,
  }
}
