import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import {
  productCategories,
  productCategoryLinks,
  productCollections,
  productCustomizations,
  productVariantMedia,
  productVariants,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { buildListingItem } from './products'

const handleParamsSchema = v.object({
  handle: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(255)
  )
})

export const storefrontCollectionsRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = getDb(c.env)

    const items = await db
      .select({
        id: productCollections.id,
        title: productCollections.title,
        handle: productCollections.handle,
        description: productCollections.description,
        imageUrl: productCollections.imageUrl,
      })
      .from(productCollections)
      .orderBy(asc(productCollections.position))

    return c.json({ items }, 200)
  })
  .get('/:handle/products', async (c) => {
    const parsed = parseParams(c, handleParamsSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20))
    const offset = (page - 1) * limit

    const collection = await db
      .select({ id: productCollections.id })
      .from(productCollections)
      .where(eq(productCollections.handle, parsed.output.handle))
      .get()

    if (!collection) {
      return c.json({ items: [], page, limit, total: 0 }, 200)
    }

    const conditions = [
      eq(products.status, 'published'),
      eq(products.collectionId, collection.id)
    ]
    const whereClause = and(...conditions)

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: products.id,
          title: products.title,
          subtitle: products.subtitle,
          handle: products.handle,
          hasVariants: products.hasVariants
        })
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(products)
        .where(whereClause)
        .get()
    ])

    const productIds = items.map((item) => item.id)

    const [categoryRows, variantRows, variantMediaRows, customizationRows] = await Promise.all([
      productIds.length > 0
        ? db
            .select({
              productId: productCategoryLinks.productId,
              name: productCategories.name
            })
            .from(productCategoryLinks)
            .innerJoin(
              productCategories,
              eq(productCategoryLinks.categoryId, productCategories.id)
            )
            .where(inArray(productCategoryLinks.productId, productIds))
        : Promise.resolve([] as Array<{ productId: number; name: string }>),
      productIds.length > 0
        ? db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, productIds))
            .orderBy(asc(productVariants.position), asc(productVariants.id))
        : Promise.resolve([] as Array<typeof productVariants.$inferSelect>),
      productIds.length > 0
        ? db
            .select({
              variantId: productVariantMedia.variantId,
              assetId: productVariantMedia.assetId,
              position: productVariantMedia.position,
              productId: productVariants.productId
            })
            .from(productVariantMedia)
            .innerJoin(productVariants, eq(productVariantMedia.variantId, productVariants.id))
            .where(inArray(productVariants.productId, productIds))
            .orderBy(
              asc(productVariantMedia.variantId),
              asc(productVariantMedia.position),
              asc(productVariantMedia.assetId)
            )
        : Promise.resolve(
            [] as Array<{
              variantId: number
              assetId: string
              position: number
              productId: number
            }>
          ),
      productIds.length > 0
        ? db
            .select({
              productId: productCustomizations.productId,
              enabled: productCustomizations.enabled
            })
            .from(productCustomizations)
            .where(inArray(productCustomizations.productId, productIds))
        : Promise.resolve([] as Array<{ productId: number; enabled: boolean }>)
    ])

    const categoriesByProductId = new Map<number, string[]>()
    for (const row of categoryRows) {
      const current = categoriesByProductId.get(row.productId) ?? []
      current.push(row.name)
      categoriesByProductId.set(row.productId, current)
    }

    const variantsByProductId = new Map<number, (typeof variantRows)[number][]>()
    for (const row of variantRows) {
      const current = variantsByProductId.get(row.productId) ?? []
      current.push(row)
      variantsByProductId.set(row.productId, current)
    }

    const variantMediaByVariantId = new Map<
      number,
      (typeof variantMediaRows)[number][]
    >()
    for (const row of variantMediaRows) {
      const current = variantMediaByVariantId.get(row.variantId) ?? []
      current.push(row)
      variantMediaByVariantId.set(row.variantId, current)
    }

    const customizationByProductId = new Map(
      customizationRows.map((row) => [row.productId, row])
    )

    const listingItems = items.map((item) =>
      buildListingItem(
        item,
        categoriesByProductId.get(item.id) ?? [],
        variantsByProductId.get(item.id) ?? [],
        variantMediaByVariantId,
        customizationByProductId.get(item.id)?.enabled ?? false
      )
    )

    return c.json({
      items: listingItems,
      page,
      limit,
      total: totalResult?.total ?? 0
    }, 200)
  })
