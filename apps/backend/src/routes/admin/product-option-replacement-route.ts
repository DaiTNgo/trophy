import { Hono } from 'hono'
import { getDb } from '../../db/client'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { replaceOptions } from './product-mutations'
import { readProduct } from './product-reader'
import { idParamsSchema, optionsSchema } from './product-schemas'

// Legacy full-replace option editor. Product detail uses operation-specific option routes.
export const productOptionReplacementRoute = new Hono<AppEnv>()
  .put('/:id/options', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionsSchema)
    if (!parsed.success) return parsed.response

    if (
      new Set(parsed.output.items.map((item) => item.title.vi.toLowerCase())).size !==
      parsed.output.items.length
    ) {
      return jsonError(c, 409, 'Option titles must be unique')
    }

    const db = getDb(c.env)
    const replaceError = await replaceOptions(db, params.output.id, parsed.output.items)
    if (replaceError) {
      return jsonError(c, replaceError.status, replaceError.error)
    }

    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
