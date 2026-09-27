import { serve } from '@hono/node-server'
import { app } from './app'
import { PUBLIC_ASSET_CORS_POLICY, createCorsMiddleware } from './lib/cors'
import { processR2CleanupJobs } from './lib/r2-cleanup-outbox'
import { processMisaDeletionJobs } from './lib/misa-deletion-outbox'
import { processExpiredShopperDraftAssets } from './lib/shopper-draft-cleanup'
import { processScheduledArticlePublishing } from './lib/article-schedule-publish'
import { assetsRoute } from './routes/assets/index'
import { fontsRoute } from './routes/fonts'
import { getAppBindings } from './lib/env'

app.use('/fonts/*', createCorsMiddleware(PUBLIC_ASSET_CORS_POLICY))
app.route('/fonts', fontsRoute)

app.use('/api/assets/*', createCorsMiddleware(PUBLIC_ASSET_CORS_POLICY))
app.route('/api/assets', assetsRoute)

export type { AppType } from './app'

const runScheduledTasks = async () => {
  const env = getAppBindings()
  try {
    await Promise.allSettled([
      processR2CleanupJobs(env),
      processMisaDeletionJobs(env),
      processExpiredShopperDraftAssets(env),
      processScheduledArticlePublishing(env),
    ])
  } catch (err) {
    console.error('[cron] Error running scheduled tasks:', err)
  }
}

// Start cron interval every 15 minutes (900,000 ms) in non-test environments
if (process.env.NODE_ENV !== 'test') {
  const CRON_INTERVAL_MS = 15 * 60 * 1000
  setInterval(runScheduledTasks, CRON_INTERVAL_MS)
}

const port = Number(process.env.PORT) || 8787

if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Backend server is running on http://localhost:${info.port}`)
    }
  )
}

export default app
