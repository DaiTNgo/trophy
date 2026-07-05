import { app } from './app'
import { assetsRoute } from './routes/assets/index'

app.route('/api/assets', assetsRoute)

export type { AppType } from './app'
export default app
