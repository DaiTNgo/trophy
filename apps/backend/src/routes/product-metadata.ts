import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../db/client'
import {
  productCategories,
  productCollections,
  productTags,
  productTypes
} from '../db/schema'
import type { AppEnv } from '../lib/env'
import { jsonError, parseJson } from '../lib/validation'

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
