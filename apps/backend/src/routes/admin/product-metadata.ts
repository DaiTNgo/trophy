import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import {
  productCategories,
  productCategoryLinks,
  productCollections,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson } from '../../lib/validation'
import { localizedString, localizedNullableText } from '../../lib/locale'
import { hydrateTranslations, upsertTranslations } from '../../lib/catalog-translation'

const trimmedString = (min = 1, max = 255) =>
  v.pipe(v.string(), v.trim(), v.minLength(min), v.maxLength(max))

const nonNegativeInt = v.pipe(v.number(), v.integer(), v.minValue(0))

const optionalHandle = v.optional(
  v.nullable(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(255),
      v.transform((value) => (value.length === 0 ? null : value))
    )
  )
)

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const createCollectionSchema = v.object({
  title: localizedString(1, 120),
  handle: optionalHandle,
  imageUrl: v.optional(v.nullable(v.string()))
})

const createCategorySchema = v.object({
  name: localizedString(1, 120),
  description: v.optional(localizedNullableText()),
  handle: optionalHandle,
  imageUrl: v.optional(v.nullable(v.string()))
})

const updateCollectionSchema = v.object({
  title: v.optional(localizedString(1, 120)),
  handle: optionalHandle,
  imageUrl: v.optional(v.nullable(v.string())),
  position: v.optional(nonNegativeInt)
})

const updateCategorySchema = v.object({
  name: v.optional(localizedString(1, 120)),
  handle: optionalHandle,
  description: v.optional(localizedNullableText()),
  imageUrl: v.optional(v.nullable(v.string())),
  position: v.optional(nonNegativeInt)
})

const updateCategoryRankingSchema = v.object({
  categories: v.array(
    v.object({
      id: v.pipe(v.number(), v.integer(), v.minValue(1)),
      position: nonNegativeInt
    })
  )
})

const idParamSchema = v.object({
  id: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.integer(),
    v.minValue(1)
  )
})

const ensureUniqueHandle = async (
  db: ReturnType<typeof getDb>,
  desiredHandle: string,
  kind: 'product_collection' | 'product_category'
) => {
  const base = slugify(desiredHandle) || kind
  let suffix = 0

  while (true) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`
    const existing =
      kind === 'product_collection'
        ? await db
            .select({ id: productCollections.id })
            .from(productCollections)
            .where(eq(productCollections.handle, candidate))
            .get()
        : await db
            .select({ id: productCategories.id })
            .from(productCategories)
            .where(eq(productCategories.handle, candidate))
            .get()

    if (!existing) {
      return candidate
    }

    suffix += 1
  }
}

export const productMetadataRoute = new Hono<AppEnv>()
  .get('/collections', async (c) => {
    const db = getDb(c.env)
    const items = await db
      .select()
      .from(productCollections)
      .orderBy(asc(productCollections.title))

    const hydratedItems = await hydrateTranslations(
      db,
      'product_collection',
      items,
      (item) => String(item.id),
      [{ fieldName: 'title', objectKey: 'title' }],
      [{ fieldName: 'title', objectKey: 'title' }]
    )

    return c.json({ items: hydratedItems }, 200)
  })
  .post('/collections', async (c) => {
    const parsed = await parseJson(c, createCollectionSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const handle = await ensureUniqueHandle(
      db,
      parsed.output.handle ?? parsed.output.title.vi,
      'product_collection'
    )
    const item = await db
      .insert(productCollections)
      .values({
        title: parsed.output.title.vi,
        handle,
        imageUrl: parsed.output.imageUrl
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product_collection', String(item.id), 'title', parsed.output.title)

    return c.json({ item }, 201)
  })
  .put('/collections/:id', async (c) => {
    const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
    if (!idParam.success) {
      return jsonError(c, 400, 'Invalid ID')
    }
    const id = idParam.output.id

    const parsed = await parseJson(c, updateCollectionSchema)
    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const existing = await db
      .select()
      .from(productCollections)
      .where(eq(productCollections.id, id))
      .get()

    if (!existing) {
      return jsonError(c, 404, 'Collection not found')
    }

    const updates: Partial<typeof productCollections.$inferInsert> = {}
    if (parsed.output.title !== undefined) updates.title = parsed.output.title.vi
    if (parsed.output.imageUrl !== undefined) updates.imageUrl = parsed.output.imageUrl
    if (parsed.output.position !== undefined) updates.position = parsed.output.position

    if (parsed.output.handle !== undefined) {
      if (parsed.output.handle !== existing.handle) {
        updates.handle = await ensureUniqueHandle(
          db,
          parsed.output.handle ?? parsed.output.title?.vi ?? existing.title,
          'product_collection'
        )
      }
    }

    let item = existing

    if (Object.keys(updates).length > 0) {
      item = await db
        .update(productCollections)
        .set(updates)
        .where(eq(productCollections.id, id))
        .returning()
        .get()
    }

    if (parsed.output.title !== undefined) {
      await upsertTranslations(db, 'product_collection', String(item.id), 'title', parsed.output.title)
    }

    const [hydratedItem] = await hydrateTranslations(
      db,
      'product_collection',
      [item],
      (i) => String(i.id),
      [{ fieldName: 'title', objectKey: 'title' }],
      [{ fieldName: 'title', objectKey: 'title' }]
    )

    return c.json({ item: hydratedItem }, 200)
  })
  .delete('/collections/:id', async (c) => {
    const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
    if (!idParam.success) {
      return jsonError(c, 400, 'Invalid ID')
    }
    const id = idParam.output.id

    const db = getDb(c.env)
    const existing = await db
      .select({ id: productCollections.id })
      .from(productCollections)
      .where(eq(productCollections.id, id))
      .get()

    if (!existing) {
      return jsonError(c, 404, 'Collection not found')
    }

    await db.delete(productCollections).where(eq(productCollections.id, id)).run()

    return new Response(null, { status: 204 })
  })
  .get('/categories', async (c) => {
    const db = getDb(c.env)
    const items = await db
      .select()
      .from(productCategories)
      .orderBy(asc(productCategories.position), asc(productCategories.id))

    const hydratedItems = await hydrateTranslations(
      db,
      'product_category',
      items,
      (item) => String(item.id),
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' }
      ],
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' }
      ]
    )

    return c.json({ categories: hydratedItems }, 200)
  })
  .post('/categories', async (c) => {
    const parsed = await parseJson(c, createCategorySchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)

    const handle = await ensureUniqueHandle(
      db,
      parsed.output.handle ?? parsed.output.name.vi,
      'product_category'
    )
    const item = await db
      .insert(productCategories)
      .values({
        name: parsed.output.name.vi,
        description: parsed.output.description ? parsed.output.description.vi ?? null : null,
        handle,
        imageUrl: parsed.output.imageUrl
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product_category', String(item.id), 'name', parsed.output.name)
    if (parsed.output.description !== undefined) {
      await upsertTranslations(db, 'product_category', String(item.id), 'description', parsed.output.description)
    }

    return c.json({ item }, 201)
  })
  .put('/categories/ranking', async (c) => {
    const parsed = await parseJson(c, updateCategoryRankingSchema)
    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const statements = parsed.output.categories.map((cat) =>
      db
        .update(productCategories)
        .set({ position: cat.position })
        .where(eq(productCategories.id, cat.id))
    )

    await db.batch(statements as any)
    return c.json({ success: true }, 200)
  })
  .put('/categories/:id', async (c) => {
    const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
    if (!idParam.success) {
      return jsonError(c, 400, 'Invalid ID')
    }
    const id = idParam.output.id

    const parsed = await parseJson(c, updateCategorySchema)
    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const existing = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .get()

    if (!existing) {
      return jsonError(c, 404, 'Category not found')
    }

    const updates: Partial<typeof productCategories.$inferInsert> = {}
    if (parsed.output.name !== undefined) updates.name = parsed.output.name.vi
    if (parsed.output.description !== undefined) {
      updates.description = parsed.output.description ? parsed.output.description.vi : null
    }
    if (parsed.output.imageUrl !== undefined) updates.imageUrl = parsed.output.imageUrl
    if (parsed.output.position !== undefined) updates.position = parsed.output.position

    if (parsed.output.handle !== undefined) {
      if (parsed.output.handle !== existing.handle) {
        updates.handle = await ensureUniqueHandle(
          db,
          parsed.output.handle ?? parsed.output.name?.vi ?? existing.name,
          'product_category'
        )
      }
    }

    let item = existing

    if (Object.keys(updates).length > 0) {
      item = await db
        .update(productCategories)
        .set(updates)
        .where(eq(productCategories.id, id))
        .returning()
        .get()
    }

    if (parsed.output.name !== undefined) {
      await upsertTranslations(db, 'product_category', String(item.id), 'name', parsed.output.name)
    }

    if (parsed.output.description !== undefined) {
      await upsertTranslations(db, 'product_category', String(item.id), 'description', parsed.output.description)
    }

    const [hydratedItem] = await hydrateTranslations(
      db,
      'product_category',
      [item],
      (i) => String(i.id),
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' }
      ],
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'description', objectKey: 'description' }
      ]
    )

    return c.json({ item: hydratedItem }, 200)
  })
  .delete('/categories/:id', async (c) => {
    const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
    if (!idParam.success) {
      return jsonError(c, 400, 'Invalid ID')
    }
    const id = idParam.output.id

    const db = getDb(c.env)
    const existing = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .get()

    if (!existing) {
      return jsonError(c, 404, 'Category not found')
    }

    await db.delete(productCategories).where(eq(productCategories.id, id)).run()

    return new Response(null, { status: 204 })
  })

const assignProductsSchema = v.object({
  addProductIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), []),
  removeProductIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), [])
})

productMetadataRoute.post('/collections/:id/products', async (c) => {
  const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
  if (!idParam.success) {
    return jsonError(c, 400, 'Invalid ID')
  }
  const id = idParam.output.id

  const parsed = await parseJson(c, assignProductsSchema)
  if (!parsed.success) {
    return parsed.response
  }

  const { addProductIds, removeProductIds } = parsed.output
  const db = getDb(c.env)

  const existing = await db
    .select({ id: productCollections.id })
    .from(productCollections)
    .where(eq(productCollections.id, id))
    .get()

  if (!existing) {
    return jsonError(c, 404, 'Collection not found')
  }

  if (addProductIds && addProductIds.length > 0) {
    await db
      .update(products)
      .set({ collectionId: id, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(products.id, addProductIds))
      .run()
  }

  if (removeProductIds && removeProductIds.length > 0) {
    await db
      .update(products)
      .set({ collectionId: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          inArray(products.id, removeProductIds),
          eq(products.collectionId, id)
        )
      )
      .run()
  }

  return c.json({ success: true }, 200)
})

productMetadataRoute.post('/categories/:id/products', async (c) => {
  const idParam = v.safeParse(idParamSchema, { id: c.req.param('id') })
  if (!idParam.success) {
    return jsonError(c, 400, 'Invalid ID')
  }
  const id = idParam.output.id

  const parsed = await parseJson(c, assignProductsSchema)
  if (!parsed.success) {
    return parsed.response
  }

  const { addProductIds, removeProductIds } = parsed.output
  const db = getDb(c.env)

  const existing = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .get()

  if (!existing) {
    return jsonError(c, 404, 'Category not found')
  }

  if (addProductIds && addProductIds.length > 0) {
    const values = addProductIds.map((productId) => ({
      productId,
      categoryId: id
    }))
    await db
      .insert(productCategoryLinks)
      .values(values)
      .onConflictDoNothing()
      .run()
  }

  if (removeProductIds && removeProductIds.length > 0) {
    await db
      .delete(productCategoryLinks)
      .where(
        and(
          eq(productCategoryLinks.categoryId, id),
          inArray(productCategoryLinks.productId, removeProductIds)
        )
      )
      .run()
  }

  return c.json({ success: true }, 200)
})
