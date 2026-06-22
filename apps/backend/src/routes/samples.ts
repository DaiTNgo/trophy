import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../db/client'
import { samples } from '../db/schema'
import type { AppEnv } from '../lib/env'
import { jsonError, parseJson, parseParams } from '../lib/validation'

const createSampleSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))
})

const idParamsSchema = v.object({
  id: v.pipe(
    v.string(),
    v.transform((input) => Number(input)),
    v.number(),
    v.integer(),
    v.minValue(1)
  )
})

export const samplesRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const db = getDb(c.env)
    const items = await db.select().from(samples).orderBy(desc(samples.id))

    return c.json({ items }, 200)
  })
  .post('/', async (c) => {
    const parsed = await parseJson(c, createSampleSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const inserted = await db
      .insert(samples)
      .values({
        name: parsed.output.name
      })
      .returning()
      .get()

    return c.json({ item: inserted }, 201)
  })
  .get('/:id', async (c) => {
    const parsed = parseParams(c, idParamsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const item = await db
      .select()
      .from(samples)
      .where(eq(samples.id, parsed.output.id))
      .get()

    if (!item) {
      return jsonError(c, 404, 'Sample not found')
    }

    return c.json({ item }, 200)
  })
