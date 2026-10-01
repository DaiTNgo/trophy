import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { username } from 'better-auth/plugins/username'
import { defaultAc, userAc } from 'better-auth/plugins/admin/access'
import * as schema from '../db/schema'
import { getDb } from '../db/client'
import { AUTH_BASE_PATH } from './auth'

const superAdminAc = defaultAc.newRole({
  user: ["set-password"],
  session: []
})

/**
 * Standalone auth instance for CLI/seed scripts.
 * Reads DATABASE_URL from environment (same as the runtime server).
 */
export const auth = betterAuth({
  appName: 'Trophy Admin',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8787',
  basePath: AUTH_BASE_PATH,
  secret: process.env.BETTER_AUTH_SECRET || 'replace-this-local-dev-secret-with-a-real-value',
  trustedOrigins: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    usePlural: true,
    schema
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8
  },
  plugins: [
    username(),
    admin({
      defaultRole: 'admin',
      adminRoles: ['super-admin', 'admin'],
      roles: {
        'super-admin': superAdminAc,
        admin: userAc
      },
      bannedUserMessage: 'This admin account has been disabled.'
    })
  ]
})
