import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, username } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { AppBindings } from './env'

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

function splitOrigins(value: string | undefined) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getAuthSettings(bindings: Partial<AppBindings>): AuthSettings {
  return {
    baseUrl: bindings.BETTER_AUTH_URL
      ? bindings.BETTER_AUTH_URL
      : {
          allowedHosts: ['127.0.0.1:*', 'localhost:*', '[::1]:*'],
          fallback: DEFAULT_AUTH_BASE_URL
        },
    trustedOrigins: Array.from(
      new Set([
        ...splitOrigins(bindings.ADMIN_APP_ORIGIN),
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174'
      ])
    ),
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
}

export type AuthInstance = ReturnType<typeof getAuth>
export type AuthSession = AuthInstance['$Infer']['Session']
