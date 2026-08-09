import { app } from './app'
import type { AppBindings } from './lib/env'
import { PUBLIC_ASSET_CORS_POLICY, createCorsMiddleware } from './lib/cors'
import { processR2CleanupJobs } from './lib/r2-cleanup-outbox'
import { processMisaDeletionJobs } from './lib/misa-deletion-outbox'
import { processExpiredShopperDraftAssets } from './lib/shopper-draft-cleanup'
import { assetsRoute } from './routes/assets/index'

app.use('/api/assets/*', createCorsMiddleware(PUBLIC_ASSET_CORS_POLICY))
app.route('/api/assets', assetsRoute)

export type { AppType } from './app'
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(processR2CleanupJobs(env))
    ctx.waitUntil(processMisaDeletionJobs(env))
    ctx.waitUntil(processExpiredShopperDraftAssets(env))
  },
}
