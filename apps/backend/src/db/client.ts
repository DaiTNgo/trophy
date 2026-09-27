import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { PgSelectBase } from 'drizzle-orm/pg-core'
import { QueryPromise } from 'drizzle-orm/query-promise'
import * as schema from './schema'
import type { AppBindings } from '../lib/env'

// Monkey-patch .get() and .all() onto PgSelectBase
if (!(PgSelectBase.prototype as any).get) {
  ;(PgSelectBase.prototype as any).get = async function () {
    const rows = await this.limit(1)
    return rows[0]
  }
}
if (!(PgSelectBase.prototype as any).all) {
  ;(PgSelectBase.prototype as any).all = function () {
    return this
  }
}

// Monkey-patch .run() and .get() onto QueryPromise (base for insert/update/delete)
if (!(QueryPromise.prototype as any).run) {
  ;(QueryPromise.prototype as any).run = function () {
    return this
  }
}
if (!(QueryPromise.prototype as any).get) {
  ;(QueryPromise.prototype as any).get = async function () {
    const rows = await this
    return Array.isArray(rows) ? rows[0] : rows
  }
}

declare module 'drizzle-orm/pg-core' {
  interface PgSelectBase<
    TTableName,
    TSelection,
    TSelectMode,
    TNullabilityMap,
    TDynamic,
    TExcludedMethods,
    TResult,
    TSelectedFields
  > {
    get(): Promise<TResult extends (infer U)[] ? U : TResult>
    all(): Promise<TResult>
  }
}

declare module 'drizzle-orm/query-promise' {
  interface QueryPromise<T> {
    run(): Promise<T>
    get(): Promise<T extends (infer U)[] ? U : T>
  }
}

declare module 'drizzle-orm/postgres-js' {
  interface PostgresJsDatabase {
    batch(queries: any[]): Promise<any[]>
  }
}

let client: postgres.Sql | null = null
let dbInstance: PostgresJsDatabase<typeof schema> | null = null

const attachBatch = (target: any) => {
  if (!target.batch) {
    target.batch = async (queries: any[]) => {
      if (typeof target.transaction === 'function') {
        return target.transaction(async () => {
          return Promise.all(
            queries.map((q) => (typeof q?.execute === 'function' ? q.execute() : q))
          )
        })
      }
      return Promise.all(
        queries.map((q) => (typeof q?.execute === 'function' ? q.execute() : q))
      )
    }
  }
}

export const getDb = (
  bindings?: Partial<AppBindings> | null
): PostgresJsDatabase<typeof schema> => {
  if (bindings?.DB) {
    const db = bindings.DB as PostgresJsDatabase<typeof schema>
    attachBatch(db)
    return db
  }
  if (!dbInstance) {
    const connectionString =
      bindings?.DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgres://trophy:trophy_secret@localhost:5432/trophy'
    client = postgres(connectionString)
    dbInstance = drizzle(client, { schema })
    attachBatch(dbInstance)
  }
  return dbInstance
}

export type Database = PostgresJsDatabase<typeof schema>
