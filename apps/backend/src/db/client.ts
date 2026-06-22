import { drizzle } from 'drizzle-orm/d1'
import type { AppBindings } from '../lib/env'
import * as schema from './schema'

export const getDb = (bindings: AppBindings) =>
  drizzle(bindings.DB, { schema })

export type Database = ReturnType<typeof getDb>
