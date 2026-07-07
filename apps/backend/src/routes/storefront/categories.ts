import { asc, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { hydrateAndResolveTranslations } from '../../lib/catalog-translation'
import { localeSchema, DEFAULT_LOCALE } from '../../lib/locale'
import * as v from 'valibot'
import { productCategories } from '../../db/schema'
import type { AppEnv } from '../../lib/env'

const storefrontCategoriesQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE)
})

export const storefrontCategoriesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = getDb(c.env)
    const all = c.req.query('all') === 'true'
    const parsedQuery = v.safeParse(storefrontCategoriesQuerySchema, c.req.query())
    const locale = parsedQuery.success ? parsedQuery.output.locale : DEFAULT_LOCALE

    const items = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        handle: productCategories.handle,
        description: productCategories.description,
        imageUrl: productCategories.imageUrl
      })
      .from(productCategories)
      .orderBy(asc(productCategories.position), asc(productCategories.id))

    const resolvedItems = await hydrateAndResolveTranslations(db, 'product_category', items, i => String(i.id), [{fieldName: 'name', objectKey: 'name'}, {fieldName: 'description', objectKey: 'description'}], [{fieldName: 'name', objectKey: 'name'}, {fieldName: 'description', objectKey: 'description'}], locale)
    return c.json({ items: resolvedItems }, 200)
  })
