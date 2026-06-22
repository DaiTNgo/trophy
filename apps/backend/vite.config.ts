import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import {
  buildBackendAllowedOrigins,
  CUSTOMIZATION_CORS_POLICY,
  SESSION_CORS_POLICY,
} from './src/lib/cors'

const devAllowedOrigins = buildBackendAllowedOrigins([
  process.env.ADMIN_APP_ORIGIN,
  process.env.STOREFRONT_APP_ORIGIN,
])

export default defineConfig({
  server: {
    cors: {
      origin: devAllowedOrigins,
      credentials: true,
      allowedHeaders: Array.from(
        new Set([
          ...SESSION_CORS_POLICY.allowHeaders,
          ...CUSTOMIZATION_CORS_POLICY.allowHeaders,
        ]),
      ),
      methods: Array.from(
        new Set([
          ...SESSION_CORS_POLICY.allowMethods,
          ...CUSTOMIZATION_CORS_POLICY.allowMethods,
        ]),
      ),
    },
    port: 8787,
    strictPort: true,
  },
  preview: {
    port: 8788,
    strictPort: true,
  },
  plugins: [cloudflare()]
})
