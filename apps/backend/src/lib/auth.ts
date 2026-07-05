import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { username } from 'better-auth/plugins/username'
import { bearer } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { AppBindings } from './env'
import { getAppCorsOrigins } from './cors'

export const AUTH_BASE_PATH = '/api/admin/auth'

const DEFAULT_AUTH_BASE_URL = 'http://localhost:8787'

type AuthSettings = {
  baseUrl:
    | string
    | {
        allowedHosts: string[]
        fallback: string
      }
  trustedOrigins: string[]
  secret: string
}

export function getAuthSettings(bindings: Partial<AppBindings>): AuthSettings {
  return {
    baseUrl: bindings.BETTER_AUTH_URL
      ? bindings.BETTER_AUTH_URL
      : {
          allowedHosts: ['127.0.0.1:*', 'localhost:*', '[::1]:*'],
          fallback: DEFAULT_AUTH_BASE_URL
        },
    trustedOrigins: getAppCorsOrigins(bindings),
    secret:
      bindings.BETTER_AUTH_SECRET ||
      'replace-this-local-dev-secret-with-a-real-value'
  }
}

export function getAuth(bindings: AppBindings) {
  const settings = getAuthSettings(bindings)

  return betterAuth({
    appName: 'Trophy Admin',
    baseURL: settings.baseUrl,
    basePath: AUTH_BASE_PATH,
    secret: settings.secret,
    trustedOrigins: settings.trustedOrigins,
    database: drizzleAdapter(getDb(bindings), {
      provider: 'sqlite',
      usePlural: true,
      schema
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8
    },
    advanced: {
      generateAuthToken: true,
    },
    plugins: [
      bearer(),
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
}

export type AuthInstance = ReturnType<typeof getAuth>
export type AuthSession = AuthInstance['$Infer']['Session']
