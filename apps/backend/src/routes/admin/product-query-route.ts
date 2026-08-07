import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import { productCategoryLinks, productCollections, products } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { idParamsSchema, searchProductsQuerySchema } from './product-schemas'
import { jsonError, parseParams } from '../../lib/validation'
import { readProduct } from './product-reader'

const parseQuery = <TOutput>(
  query: Record<string, string | undefined>,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
) => {
  const result = v.safeParse(schema, query)
  return result.success
    ? { success: true as const, output: result.output }
    : { success: false as const, issues: result.issues }
}

export const productQueryRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const parsedQuery = parseQuery(c.req.query(), searchProductsQuerySchema)
    if (!parsedQuery.success) {
      return c.json({
        error: 'Validation failed',
        issues: parsedQuery.issues.map((issue) => ({
          message: issue.message ?? 'Invalid value',
          path: Array.isArray(issue.path) && issue.path.length > 0 && 'key' in issue.path[0]
            ? String(issue.path[0].key)
            : null
        }))
      }, 400)
    }

    const db = getDb(c.env)
    const page = parsedQuery.output.page ?? 1
    const limit = parsedQuery.output.limit ?? 20
    const conditions = []
    if (parsedQuery.output.q) {
      const pattern = `%${parsedQuery.output.q.toLowerCase()}%`
      conditions.push(or(
        like(sql`lower(${products.title})`, pattern),
        like(sql`lower(${products.subtitle})`, pattern),
        like(sql`lower(${products.handle})`, pattern)
      ))
    }
    if (parsedQuery.output.status) conditions.push(eq(products.status, parsedQuery.output.status))
    if (parsedQuery.output.collectionId) conditions.push(eq(products.collectionId, parsedQuery.output.collectionId))
    if (parsedQuery.output.categoryId) {
      conditions.push(sql`exists (select 1 from ${productCategoryLinks} where ${productCategoryLinks.productId} = ${products.id} and ${productCategoryLinks.categoryId} = ${parsedQuery.output.categoryId})`)
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const [items, totalResult] = await Promise.all([
      db.select({
        id: products.id,
        title: products.title,
        subtitle: products.subtitle,
        handle: products.handle,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        collection: { id: productCollections.id, title: productCollections.title, handle: productCollections.handle }
      }).from(products).leftJoin(productCollections, eq(products.collectionId, productCollections.id))
        .where(whereClause).orderBy(desc(products.id)).limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)` }).from(products).where(whereClause).get()
    ])
    return c.json({ items, page, limit, total: totalResult?.total ?? 0 }, 200)
  })
  .get('/:id', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const product = await readProduct(c, getDb(c.env), params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    return c.json({ item: product }, 200)
  })
