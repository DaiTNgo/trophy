import { asc, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { productCategories } from '../../db/schema'
import type { AppEnv } from '../../lib/env'

export const storefrontCategoriesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = getDb(c.env)
    const all = c.req.query('all') === 'true'

    const items = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        handle: productCategories.handle,
        description: productCategories.description,
        imageUrl: productCategories.imageUrl
      })
      .from(productCategories)
      .orderBy(asc(productCategories.name))

    return c.json({ items }, 200)
  })
