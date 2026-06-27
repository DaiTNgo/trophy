import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { username } from 'better-auth/plugins/username'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import * as schema from '../db/schema'
import { AUTH_BASE_PATH } from './auth'

export const auth = betterAuth({
  appName: 'Trophy Admin',
  baseURL: 'http://localhost:8787',
  basePath: AUTH_BASE_PATH,
  secret: 'replace-this-local-dev-secret-with-a-real-value',
  trustedOrigins: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  database: drizzleAdapter({} as never, {
    provider: 'sqlite',
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
        'super-admin': adminAc,
        admin: userAc
      },
      bannedUserMessage: 'This admin account has been disabled.'
    })
  ]
})
