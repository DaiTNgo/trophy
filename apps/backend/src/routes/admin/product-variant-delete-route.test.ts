import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))
vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))

import { getDb } from '../../db/client'
import { readProduct } from './product-reader'
import { productVariantDeleteRoute } from './product-variant-delete-route'

type Mutation = { kind: 'insert' | 'update' | 'delete'; values?: unknown; set?: unknown }

function createDb() {
  const mutations: Mutation[] = []
  const selectQueue: unknown[] = []
  const statement = (kind?: Mutation['kind']): any => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      values: vi.fn((values: unknown) => {
        if (kind) mutations.push({ kind, values })
        return chain
      }),
      set: vi.fn((set: unknown) => {
        if (kind) mutations.push({ kind, set })
        return chain
      }),
      returning: vi.fn(() => chain),
      get: vi.fn(async () => kind === 'update' ? { id: 7 } : selectQueue.shift() ?? null),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(selectQueue.shift() ?? []).then(resolve),
    }
    return chain
  }
  return {
    mutations,
    selectQueue,
    select: vi.fn(() => statement()),
    insert: vi.fn(() => statement('insert')),
    update: vi.fn(() => statement('update')),
    delete: vi.fn(() => statement('delete')),
    batch: vi.fn(async () => undefined),
  }
}

const revision = '2026-08-09T00:00:00.000Z'

describe('variant deletion MISA outbox contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('commits the local deletion and queues remote MISA deletion without calling MISA inline', async () => {
    const db = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct)
      .mockResolvedValueOnce({
        id: 7,
        updatedAt: revision,
        variants: [
          { id: 1, isDefault: true, misaSyncStatus: 'pending', misaProductId: null, customizationMedia: null },
          { id: 2, isDefault: false, misaSyncStatus: 'synced', misaProductId: 101, customizationMedia: null },
        ],
      } as never)
      .mockResolvedValueOnce({ id: 7, updatedAt: revision, variants: [] } as never)
    db.selectQueue.push(null)

    const response = await productVariantDeleteRoute.request('/7/variants/2', {
      method: 'DELETE',
      headers: { 'If-Match': revision },
    }, {} as never)

    expect(response.status).toBe(200)
    expect(db.batch).toHaveBeenCalledTimes(1)
    expect(db.mutations).toContainEqual({
      kind: 'insert',
      values: expect.arrayContaining([expect.objectContaining({ misaProductId: 101 })]),
    })
  })
})
