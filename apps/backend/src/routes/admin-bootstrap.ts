import { Hono } from 'hono'
import { count } from 'drizzle-orm'
import * as v from 'valibot'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import type { AppEnv } from '../lib/env'
import { getAuth, getBootstrapSecret } from '../lib/auth'

const bootstrapSchema = v.object({
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Username is required.'),
    v.minLength(3, 'Username must be at least 3 characters.')
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty('Password is required.'),
    v.minLength(8, 'Password must be at least 8 characters.')
  ),
  bootstrapSecret: v.pipe(
    v.string(),
    v.nonEmpty('Bootstrap secret is required.')
  )
})

function buildSeedEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`
}

async function hasAnyUsers(env: AppEnv['Bindings']) {
  const db = getDb(env)
  const result = await db.select({ value: count() }).from(users)
  return (result[0]?.value ?? 0) > 0
}

export const adminBootstrapRoute = new Hono<AppEnv>()

adminBootstrapRoute.get('/status', async (c) => {
  return c.json(
    {
      hasUsers: await hasAnyUsers(c.env)
    },
    200
  )
})

adminBootstrapRoute.post('/', async (c) => {
  const auth = getAuth(c.env)

  if (await hasAnyUsers(c.env)) {
    return c.json(
      {
        message: 'Admin bootstrap is already complete.'
      },
      409
    )
  }

  const expectedSecret = getBootstrapSecret(c.env, c.req.url)
  if (!expectedSecret) {
    return c.json(
      {
        message:
          'Bootstrap secret is not configured. Set ADMIN_BOOTSTRAP_SECRET before creating the first admin.'
      },
      503
    )
  }

  const body = await c.req.json().catch(() => null)
  const result = v.safeParse(bootstrapSchema, body)

  if (!result.success) {
    return c.json(
      {
        message: 'Invalid bootstrap payload.',
        issues: result.issues
      },
      400
    )
  }

  if (result.output.bootstrapSecret !== expectedSecret) {
    return c.json(
      {
        message: 'Bootstrap secret is invalid.'
      },
      403
    )
  }

  const created = await auth.api.createUser({
    body: {
      email: buildSeedEmail(result.output.username),
      name: result.output.username,
      username: result.output.username,
      password: result.output.password,
      role: 'super-admin',
      data: {
        displayUsername: result.output.username
      }
    }
  })

  return c.json(
    {
      user: created.user
    },
    201
  )
})
