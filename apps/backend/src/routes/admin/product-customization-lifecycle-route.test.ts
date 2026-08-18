import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))

vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))

import { getDb } from '../../db/client'
import { readProduct } from './product-reader'
import { productsRoute } from './products'

type MutationRecord = {
  kind: 'insert' | 'update' | 'delete'
  values?: unknown
  set?: unknown
  where?: unknown
}

function createQueryChain({
  getQueue,
  mutations,
  kind,
}: {
  getQueue: unknown[]
  mutations: MutationRecord[]
  kind?: MutationRecord['kind']
}) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn((where?: unknown) => {
      if (kind && where) mutations.push({ kind, where })
      return chain
    }),
    innerJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    get: vi.fn(async () => kind === 'update' ? { id: 7 } : getQueue.shift() ?? null),
    values: vi.fn((values: unknown) => {
      if (kind) mutations.push({ kind, values })
      return chain
    }),
    set: vi.fn((set: unknown) => {
      if (kind) mutations.push({ kind, set })
      return chain
    }),
    onConflictDoUpdate: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(
      Array.isArray(getQueue[0]) ? getQueue.shift() : []
    ).then(resolve),
  }
  return chain
}

function createMockDb() {
  const getQueue: unknown[] = []
  const claimQueue: unknown[] = []
  const mutations: MutationRecord[] = []

  const db: any = {
    getQueue,
    claimQueue,
    mutations,
    select: vi.fn(() => createQueryChain({ getQueue, mutations })),
    insert: vi.fn(() => createQueryChain({ getQueue, mutations, kind: 'insert' })),
    update: vi.fn(() => {
      const chain = createQueryChain({ getQueue, mutations, kind: 'update' })
      chain.get.mockImplementation(async () => claimQueue.length > 0 ? claimQueue.shift() : { id: 7 })
      return chain
    }),
    delete: vi.fn(() => createQueryChain({ getQueue, mutations, kind: 'delete' })),
    batch: vi.fn(async (statements: Promise<unknown>[]) => Promise.all(statements)),
  }
  return db
}

function buildPng(width: number, height: number) {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

const backgroundFile = (width = 1200, height = 900) =>
  new File([buildPng(width, height)], 'bg.png', { type: 'image/png' })

type MockProduct = {
  id: number
  updatedAt: string
  customization?: {
    enabled: boolean
    canvasWidthPx: number | null
    canvasHeightPx: number | null
  } | null
  variants: Array<{ id: number; customizationMedia?: { widthPx: number | null; heightPx: number | null } | null }>
}

type ReadProductResult = Awaited<ReturnType<typeof readProduct>>

const productRevision = '2026-08-09T00:00:00.000Z'

const productWithCustomization = (overrides: Partial<MockProduct> = {}): ReadProductResult => ({
  id: 7,
  updatedAt: productRevision,
  customization: null,
  variants: [
    { id: 1, customizationMedia: { widthPx: 1200, heightPx: 900 } },
    { id: 2, customizationMedia: { widthPx: 1200, heightPx: 900 } },
  ],
  ...overrides,
}) as unknown as ReadProductResult

const env = {
  DB: {},
  CUSTOMIZATION_ASSETS: {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  },
} as never

const request = (path: string, init: RequestInit, _env = env) =>
  productsRoute.request(path, {
    ...init,
    headers: { ...init.headers, 'If-Match': productRevision },
  }, env)

function activationForm() {
  const form = new FormData()
  form.append('payload', JSON.stringify({ layers: [], formFields: [], backgrounds: { 1: { widthPx: 1200, heightPx: 900 }, 2: { widthPx: 1200, heightPx: 900 } } }))
  form.append('1', backgroundFile())
  form.append('2', backgroundFile())
  return form
}

const categoryGet = { id: 3, name: 'Tùy chỉnh', handle: 'customization', description: null, imageUrl: null, position: 0 }

function setup(db: ReturnType<typeof createMockDb>) {
  vi.mocked(getDb).mockReturnValue(db as never)
  vi.mocked(readProduct).mockReset()
  vi.clearAllMocks()
  vi.mocked(getDb).mockReturnValue(db as never)
  vi.mocked(readProduct).mockReset()
  db.getQueue.push(categoryGet)
}

describe('customization activation route contract', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
    setup(db)
  })

  it('rejects activation when customization is already saved for the product', async () => {
    vi.mocked(readProduct).mockResolvedValue(
      productWithCustomization({ customization: { enabled: false, canvasWidthPx: null, canvasHeightPx: null } })
    )

    const res = await request('/7/customization/activate', { method: 'POST', body: new FormData() }, env)

    expect(res.status).toBe(409)
  })

  it('rejects activation when the Product has no Variant to receive a background', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization({ variants: [] }))

    const res = await request('/7/customization/activate', { method: 'POST', body: new FormData() }, env)

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'Product requires at least one Variant before customization can be activated',
    })
  })

  it('rejects activation from a stale Product revision before creating assets', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization({
      updatedAt: '2026-08-09T00:01:00.000Z',
    }))

    const res = await request('/7/customization/activate', {
      method: 'POST',
      body: activationForm(),
    })

    expect(res.status).toBe(409)
    expect((env as never as { CUSTOMIZATION_ASSETS: { put: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.put)
      .not.toHaveBeenCalled()
  })

  it('rejects activation when another request claims the same revision first', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())
    db.claimQueue.push(null)

    const res = await request('/7/customization/activate', {
      method: 'POST',
      body: activationForm(),
    })

    expect(res.status).toBe(409)
    expect((env as never as { CUSTOMIZATION_ASSETS: { put: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.put)
      .not.toHaveBeenCalled()
  })

  it('activates customization and stores a background for every current variant', async () => {
    vi.mocked(readProduct)
      .mockResolvedValueOnce(productWithCustomization())
      .mockResolvedValueOnce(productWithCustomization({
        customization: { enabled: true, canvasWidthPx: 1200, canvasHeightPx: 900 },
      }))

    const res = await request('/7/customization/activate', {
      method: 'POST',
      body: activationForm(),
    }, env)

    expect(res.status).toBe(200)
    expect(db.mutations.some((m: MutationRecord) => m.kind === 'insert' && (m.values as any)?.enabled === true)).toBe(true)
    expect((env as never as { CUSTOMIZATION_ASSETS: { put: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.put).toHaveBeenCalledTimes(2)
  })

  it('compensates only this request R2 objects when the activation D1 batch fails', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())
    db.batch.mockRejectedValueOnce(new Error('D1 unavailable'))

    const res = await request('/7/customization/activate', {
      method: 'POST',
      body: activationForm(),
    }, env)

    expect(res.status).toBe(500)
    expect((env as never as { CUSTOMIZATION_ASSETS: { delete: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.delete)
      .toHaveBeenCalledTimes(2)
    expect(db.mutations.filter((mutation: MutationRecord) => mutation.kind === 'delete')).toHaveLength(0)
  })

  it('rejects activation when every variant does not receive a background', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())

    const form = new FormData()
    form.append('payload', JSON.stringify({ layers: [], formFields: [], backgrounds: { 1: { widthPx: 1200, heightPx: 900 } } }))
    form.append('1', backgroundFile())
    const res = await request('/7/customization/activate', { method: 'POST', body: form }, env)

    expect(res.status).toBe(400)
  })

  it('rejects activation when all backgrounds must share the same size', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())

    const form = new FormData()
    form.append('payload', JSON.stringify({ layers: [], formFields: [], backgrounds: { 1: { widthPx: 1200, heightPx: 900 }, 2: { widthPx: 800, heightPx: 600 } } }))
    form.append('1', backgroundFile(1200, 900))
    form.append('2', backgroundFile(800, 600))
    const res = await request('/7/customization/activate', { method: 'POST', body: form }, env)

    expect(res.status).toBe(409)
  })
})

describe('customization deactivate route contract', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
    setup(db)
  })

  it('deactivates a saved customization and unlinks the category', async () => {
    vi.mocked(readProduct)
      .mockResolvedValueOnce(
        productWithCustomization({ customization: { enabled: true, canvasWidthPx: 1200, canvasHeightPx: 900 } })
      )
      .mockResolvedValueOnce(
        productWithCustomization({ customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 } })
      )

    const res = await request('/7/customization/deactivate', { method: 'POST' }, env)

    expect(res.status).toBe(200)
    expect(db.mutations).toContainEqual({ kind: 'update', set: expect.objectContaining({ enabled: false }) })
    expect(db.batch).toHaveBeenCalledTimes(1)
  })

  it('rejects deactivate when customization is not saved', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())

    const res = await request('/7/customization/deactivate', { method: 'POST' }, env)

    expect(res.status).toBe(409)
  })
})

describe('customization reactivate route contract', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
    setup(db)
  })

  it('reactivates directly when every variant still matches the saved canvas', async () => {
    vi.mocked(readProduct)
      .mockResolvedValueOnce(
        productWithCustomization({ customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 } })
      )
      .mockResolvedValueOnce(
        productWithCustomization({ customization: { enabled: true, canvasWidthPx: 1200, canvasHeightPx: 900 } })
      )

    const res = await request('/7/customization/reactivate', { method: 'POST' }, env)

    expect(res.status).toBe(200)
    expect(db.mutations).toContainEqual({ kind: 'update', set: expect.objectContaining({ enabled: true }) })
    expect(db.batch).toHaveBeenCalledTimes(1)
  })

  it('reports which variant ids are missing a background', async () => {
    vi.mocked(readProduct).mockResolvedValue(
      productWithCustomization({
        customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 },
        variants: [
          { id: 1, customizationMedia: { widthPx: 1200, heightPx: 900 } },
          { id: 2, customizationMedia: null },
        ],
      })
    )

    const res = await request('/7/customization/reactivate', { method: 'POST' }, env)

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Customization requires backgrounds for variants added while inactive',
      missingBackgroundVariantIds: [2],
    })
  })

  it('rejects reactivation when customization was never saved', async () => {
    vi.mocked(readProduct).mockResolvedValue(productWithCustomization())

    const res = await request('/7/customization/reactivate', { method: 'POST' }, env)

    expect(res.status).toBe(409)
  })
})

describe('customization repair route contract', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
    setup(db)
  })

  it('repairs a missing background and reactivates with the saved canvas size', async () => {
    vi.mocked(readProduct)
      .mockResolvedValueOnce(
        productWithCustomization({
          customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 },
          variants: [
            { id: 1, customizationMedia: { widthPx: 1200, heightPx: 900 } },
            { id: 2, customizationMedia: null },
          ],
        })
      )
      .mockResolvedValueOnce(
        productWithCustomization({ customization: { enabled: true, canvasWidthPx: 1200, canvasHeightPx: 900 } })
      )
    db.getQueue.push(null) // variant-2 customization media does not exist
    db.getQueue.push({ id: 'asset-id', ownerKey: 'catalog:7', widthPx: 1200, heightPx: 900 })
    db.getQueue.push(null) // no old asset for variant 2

    const form = new FormData()
    form.append('payload', JSON.stringify({ layers: [], formFields: [], backgrounds: { 2: { widthPx: 1200, heightPx: 900 } } }))
    form.append('2', backgroundFile())

    const res = await request('/7/customization/repair', { method: 'POST', body: form }, env)

    expect(res.status).toBe(200)
    expect(db.mutations).toContainEqual({ kind: 'update', set: expect.objectContaining({ enabled: true }) })
  })

  it('rejects repair when customization has no missing backgrounds', async () => {
    vi.mocked(readProduct).mockResolvedValue(
      productWithCustomization({ customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 } })
    )

    const res = await request('/7/customization/repair', { method: 'POST', body: new FormData() }, env)

    expect(res.status).toBe(409)
  })
})

describe('customization permanent delete route contract', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
    setup(db)
  })

  it('rejects permanent deletion while customization is active', async () => {
    vi.mocked(readProduct).mockResolvedValue(
      productWithCustomization({ customization: { enabled: true, canvasWidthPx: 1200, canvasHeightPx: 900 } })
    )

    const res = await request('/7/customization/permanent', { method: 'DELETE' }, env)

    expect(res.status).toBe(409)
  })

  it('queues deactivated background cleanup and clears a matching thumbnail', async () => {
    vi.mocked(readProduct)
      .mockResolvedValueOnce(productWithCustomization({
        customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 },
      }))
      .mockResolvedValueOnce(productWithCustomization({ customization: null }))
    db.getQueue.length = 0
    db.getQueue.push(
      { productId: 7, layersJson: '[]', formFieldsJson: '[]' },
      [{ variantId: 1, assetId: 'background_asset' }],
      [{ id: 'background_asset', objectKey: 'catalog/7/background.png' }],
      categoryGet,
    )

    const res = await request('/7/customization/permanent', { method: 'DELETE' }, env)

    expect(res.status).toBe(200)
    expect((env as never as { CUSTOMIZATION_ASSETS: { delete: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.delete)
      .not.toHaveBeenCalled()
    expect(db.mutations).toContainEqual({
      kind: 'insert',
      values: expect.arrayContaining([expect.objectContaining({ objectKey: 'catalog/7/background.png' })]),
    })
    expect(db.mutations).toContainEqual({ kind: 'update', set: expect.objectContaining({ thumbnailAssetId: null }) })
  })
})
