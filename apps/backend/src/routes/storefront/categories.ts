import { and, asc, eq, isNull, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { toAbsoluteAssetUrl } from '../../lib/url'
import { getDb } from '../../db/client'
import {
  hydrateTranslations,
  hydrateAndResolveTranslations,
} from '../../lib/catalog-translation'
import { localeSchema, DEFAULT_LOCALE } from '../../lib/locale'
import * as v from 'valibot'
import {
  productCategories,
  productCategoryLinks,
  productCollections,
  productCollectionLinks,
  products,
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { parseParams } from '../../lib/validation'
import {
  buildCustomizableCondition,
  loadListingPage,
  type CustomizableFilter,
} from './collections'

const storefrontCategoriesQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
})

const handleParamsSchema = v.object({
  handle: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
})

const categoryProductsQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
  customizable: v.optional(v.picklist(['all', 'true', 'false']), 'all'),
  collection: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(255),
      v.transform((value) => (value.length === 0 ? undefined : value))
    )
  ),
  page: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.transform((value) => (value.length === 0 ? 1 : Number(value))),
      v.number(),
      v.integer(),
      v.minValue(1)
    )
  ),
  limit: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.transform((value) => (value.length === 0 ? 20 : Number(value))),
      v.number(),
      v.integer(),
      v.minValue(1),
      v.maxValue(100)
    )
  ),
})

export const storefrontCategoriesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = getDb(c.env)
    const parsedQuery = v.safeParse(storefrontCategoriesQuerySchema, c.req.query())
    const locale = parsedQuery.success ? parsedQuery.output.locale : DEFAULT_LOCALE

    const items = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        handle: productCategories.handle,
        description: productCategories.description,
        imageUrl: productCategories.imageUrl,
      })
      .from(productCategories)
      .where(eq(productCategories.visibility, 'public'))
      .orderBy(asc(productCategories.position), asc(productCategories.id))

    const resolvedItems = await hydrateAndResolveTranslations(
      db,
      'product_category',
      items,
      (i) => String(i.id),
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' },
      ],
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' },
      ],
      locale
    )
    return c.json(
      {
        items: resolvedItems.map((item) => ({
          ...item,
          imageUrl: item.imageUrl
            ? (toAbsoluteAssetUrl(c, item.imageUrl) as string)
            : null,
        })),
      },
      200
    )
  })
  .get('/:handle/products', async (c) => {
    const parsed = parseParams(c, handleParamsSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const parsedQuery = v.safeParse(categoryProductsQuerySchema, c.req.query())
    if (!parsedQuery.success) {
      return c.json({ error: 'Validation failed' }, 400)
    }

    const customizable = parsedQuery.output.customizable as CustomizableFilter
    const page = Math.max(1, Number(c.req.query('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20))
    const offset = (page - 1) * limit

    const category = await db
      .select({
        id: productCategories.id,
        visibility: productCategories.visibility,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.handle, parsed.output.handle),
          eq(productCategories.visibility, 'public')
        )
      )
      .get()

    if (!category) {
      return c.json({ error: 'Category not found' }, 404)
    }

    const availableCollectionRows = await db
      .select({
        id: productCollections.id,
        title: productCollections.title,
        handle: productCollections.handle,
        position: productCollections.position,
      })
      .from(productCollections)
      .where(
        and(
          or(
            eq(productCollections.visibility, 'public'),
            isNull(productCollections.visibility)
          ),
          sql`exists (
            select 1
            from ${productCollectionLinks}
            inner join ${products}
              on ${products.id} = ${productCollectionLinks.productId}
            inner join ${productCategoryLinks}
              on ${productCategoryLinks.productId} = ${products.id}
            where ${productCollectionLinks.collectionId} = ${productCollections.id}
              and ${productCategoryLinks.categoryId} = ${category.id}
              and ${products.status} = 'published'
              and ${products.deletedAt} is null
          )`
        )
      )
      .orderBy(asc(productCollections.position), asc(productCollections.id))

    const hydratedCollections = await hydrateTranslations(
      db,
      'product_collection',
      availableCollectionRows,
      (item) => String(item.id),
      [{ fieldName: 'title', objectKey: 'title' }],
      [{ fieldName: 'title', objectKey: 'title' }]
    )

    const availableCollections = hydratedCollections.map((col) => ({
      id: col.id,
      title: col.title,
      handle: col.handle,
    }))

    const conditions = [
      eq(products.status, 'published'),
      isNull(products.deletedAt),
      sql`exists (
        select 1
        from ${productCategoryLinks}
        where ${productCategoryLinks.productId} = ${products.id}
          and ${productCategoryLinks.categoryId} = ${category.id}
      )`,
    ]

    if (parsedQuery.output.collection) {
      conditions.push(
        sql`exists (
          select 1
          from ${productCollectionLinks}
          inner join ${productCollections}
            on ${productCollections.id} = ${productCollectionLinks.collectionId}
          where ${productCollectionLinks.productId} = ${products.id}
            and ${productCollections.handle} = ${parsedQuery.output.collection}
            and (${productCollections.visibility} = 'public' or ${productCollections.visibility} is null)
        )`
      )
    }

    const customizableCondition = buildCustomizableCondition(customizable)
    if (customizableCondition) {
      conditions.push(customizableCondition)
    }

    const whereClause = and(...conditions)
    const primary = await loadListingPage(c, db, whereClause, limit, offset)

    return c.json(
      {
        items: primary.items,
        page,
        limit,
        total: primary.total,
        availableCollections,
      },
      200
    )
  })
