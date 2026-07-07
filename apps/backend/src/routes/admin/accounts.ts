import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { getAuth } from '../../lib/auth'
import { getAdminSession } from '../../lib/admin-session'

const schema = v.object({
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Username is required.'),
    v.minLength(3, 'Username must be at least 3 characters.'),
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty('Password is required.'),
    v.minLength(8, 'Password must be at least 8 characters.'),
  ),
})

function buildEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`
}

export const adminAccountsRoute = new Hono<AppEnv>()

adminAccountsRoute.post('/create', async (c) => {
  const auth = getAuth(c.env)

  const session = await getAdminSession(c.env, c.req.raw.headers)

  if (!session?.user || (session.user as any).role !== 'super-admin') {
    return c.json({ message: 'Unauthorized' }, 403)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = v.safeParse(schema, body)

  if (!parsed.success) {
    return c.json({ message: 'Invalid payload.', issues: parsed.issues }, 400)
  }

  // @ts-ignore
    const created = await auth.api.createUser({
    body: {
      email: buildEmail(parsed.output.username),
      name: parsed.output.username,
      password: parsed.output.password,
      role: 'admin',
      data: {
        displayUsername: parsed.output.username,
      },
    },
  })

  const db = getDb(c.env)
  await db
    .update(users)
    .set({ username: parsed.output.username })
    .where(eq(users.id, created.user.id))

  return c.json({ user: created.user }, 201)
})
