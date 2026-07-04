import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import {
  productCategories,
  productCollections,
  productTags,
  productTypes
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson } from '../../lib/validation'

const trimmedString = (min = 1, max = 255) =>
  v.pipe(v.string(), v.trim(), v.minLength(min), v.maxLength(max))

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

const createTypeSchema = v.object({
  value: trimmedString(1, 120)
})

const createCollectionSchema = v.object({
  title: trimmedString(1, 120),
  handle: optionalHandle
})

const createCategorySchema = v.object({
  name: trimmedString(1, 120),
  handle: optionalHandle,
  parentId: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))))
})

const createTagSchema = v.object({
  value: trimmedString(1, 120)
})

const updateCollectionSchema = v.object({
  title: v.optional(trimmedString(1, 120)),
  handle: optionalHandle,
  description: v.optional(v.nullable(v.string())),
  imageUrl: v.optional(v.nullable(v.string())),
  position: v.optional(v.number())
})

const updateCategorySchema = v.object({
  name: v.optional(trimmedString(1, 120)),
  handle: optionalHandle,
  parentId: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  description: v.optional(v.nullable(v.string())),
  imageUrl: v.optional(v.nullable(v.string()))
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
  kind: 'collection' | 'category'
) => {
  const base = slugify(desiredHandle) || kind
  let suffix = 0

  while (true) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`
    const existing =
      kind === 'collection'
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
  .get('/types', async (c) => {
    const db = getDb(c.env)
    const items = await db.select().from(productTypes).orderBy(asc(productTypes.value))

    return c.json({ items }, 200)
  })
  .post('/types', async (c) => {
    const parsed = await parseJson(c, createTypeSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const existing = await db
      .select({ id: productTypes.id })
      .from(productTypes)
      .where(eq(productTypes.value, parsed.output.value))
      .get()

    if (existing) {
      return jsonError(c, 409, 'Product type already exists')
    }

    const item = await db
      .insert(productTypes)
      .values({ value: parsed.output.value })
      .returning()
      .get()

    return c.json({ item }, 201)
  })
  .get('/collections', async (c) => {
    const db = getDb(c.env)
    const items = await db
      .select()
      .from(productCollections)
      .orderBy(asc(productCollections.title))

    return c.json({ items }, 200)
  })
  .post('/collections', async (c) => {
    const parsed = await parseJson(c, createCollectionSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const handle = await ensureUniqueHandle(
      db,
      parsed.output.handle ?? parsed.output.title,
      'collection'
    )
    const item = await db
      .insert(productCollections)
      .values({
        title: parsed.output.title,
        handle
      })
      .returning()
      .get()

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
    if (parsed.output.title !== undefined) updates.title = parsed.output.title
    if (parsed.output.description !== undefined) updates.description = parsed.output.description
    if (parsed.output.imageUrl !== undefined) updates.imageUrl = parsed.output.imageUrl
    if (parsed.output.position !== undefined) updates.position = parsed.output.position

    if (parsed.output.handle !== undefined) {
      if (parsed.output.handle !== existing.handle) {
        updates.handle = await ensureUniqueHandle(
          db,
          parsed.output.handle ?? parsed.output.title ?? existing.title,
          'collection'
        )
      }
    }

    if (Object.keys(updates).length > 0) {
      const item = await db
        .update(productCollections)
        .set(updates)
        .where(eq(productCollections.id, id))
        .returning()
        .get()

      return c.json({ item }, 200)
    }

    return c.json({ item: existing }, 200)
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
      .orderBy(asc(productCategories.name))

    return c.json({ items }, 200)
  })
  .post('/categories', async (c) => {
    const parsed = await parseJson(c, createCategorySchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)

    if (parsed.output.parentId) {
      const parent = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(eq(productCategories.id, parsed.output.parentId))
        .get()

      if (!parent) {
        return jsonError(c, 404, 'Parent category not found')
      }
    }

    const handle = await ensureUniqueHandle(
      db,
      parsed.output.handle ?? parsed.output.name,
      'category'
    )
    const item = await db
      .insert(productCategories)
      .values({
        name: parsed.output.name,
        handle,
        parentId: parsed.output.parentId ?? null
      })
      .returning()
      .get()

    return c.json({ item }, 201)
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
    if (parsed.output.name !== undefined) updates.name = parsed.output.name
    if (parsed.output.description !== undefined) updates.description = parsed.output.description
    if (parsed.output.imageUrl !== undefined) updates.imageUrl = parsed.output.imageUrl
    
    if (parsed.output.parentId !== undefined) {
      if (parsed.output.parentId !== null && parsed.output.parentId !== existing.parentId) {
        const parent = await db
          .select({ id: productCategories.id })
          .from(productCategories)
          .where(eq(productCategories.id, parsed.output.parentId))
          .get()

        if (!parent) {
          return jsonError(c, 404, 'Parent category not found')
        }
        
        if (parsed.output.parentId === id) {
          return jsonError(c, 400, 'Category cannot be its own parent')
        }
      }
      updates.parentId = parsed.output.parentId
    }

    if (parsed.output.handle !== undefined) {
      if (parsed.output.handle !== existing.handle) {
        updates.handle = await ensureUniqueHandle(
          db,
          parsed.output.handle ?? parsed.output.name ?? existing.name,
          'category'
        )
      }
    }

    if (Object.keys(updates).length > 0) {
      const item = await db
        .update(productCategories)
        .set(updates)
        .where(eq(productCategories.id, id))
        .returning()
        .get()

      return c.json({ item }, 200)
    }

    return c.json({ item: existing }, 200)
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
  .get('/tags', async (c) => {
    const db = getDb(c.env)
    const items = await db.select().from(productTags).orderBy(asc(productTags.value))

    return c.json({ items }, 200)
  })
  .post('/tags', async (c) => {
    const parsed = await parseJson(c, createTagSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const existing = await db
      .select({ id: productTags.id })
      .from(productTags)
      .where(eq(productTags.value, parsed.output.value))
      .get()

    if (existing) {
      return jsonError(c, 409, 'Product tag already exists')
    }

    const item = await db
      .insert(productTags)
      .values({ value: parsed.output.value })
      .returning()
      .get()

    return c.json({ item }, 201)
  })

productMetadataRoute.put('/collections/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return jsonError(c, 400, 'Invalid ID')

  const parsed = await parseJson(c, createCollectionSchema)
  if (!parsed.success) return parsed.response

  const db = getDb(c.env)
  
  let handle = parsed.output.handle
  if (!handle && parsed.output.title) {
    handle = await ensureUniqueHandle(db, parsed.output.title, 'collection')
  }

  const updateData: any = { title: parsed.output.title }
  if (handle) updateData.handle = handle

  const item = await db
    .update(productCollections)
    .set(updateData)
    .where(eq(productCollections.id, id))
    .returning()
    .get()

  if (!item) return jsonError(c, 404, 'Collection not found')
  return c.json({ item }, 200)
})
.delete('/collections/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return jsonError(c, 400, 'Invalid ID')

  const db = getDb(c.env)
  await db.delete(productCollections).where(eq(productCollections.id, id))
  
  return new Response(null, { status: 204 })
})

productMetadataRoute.put('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return jsonError(c, 400, 'Invalid ID')

  const parsed = await parseJson(c, createCategorySchema)
  if (!parsed.success) return parsed.response

  const db = getDb(c.env)
  
  let handle = parsed.output.handle
  if (!handle && parsed.output.name) {
    handle = await ensureUniqueHandle(db, parsed.output.name, 'category')
  }

  const updateData: any = { 
    name: parsed.output.name,
    parentId: parsed.output.parentId ?? null
  }
  if (handle) updateData.handle = handle

  const item = await db
    .update(productCategories)
    .set(updateData)
    .where(eq(productCategories.id, id))
    .returning()
    .get()

  if (!item) return jsonError(c, 404, 'Category not found')
  return c.json({ item }, 200)
})
.delete('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return jsonError(c, 400, 'Invalid ID')

  const db = getDb(c.env)
  await db.delete(productCategories).where(eq(productCategories.id, id))
  
  return new Response(null, { status: 204 })
})
