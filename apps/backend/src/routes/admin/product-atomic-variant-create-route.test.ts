import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))
vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))
vi.mock('./product-atomic-variant-multipart', () => ({ parseAtomicVariantMultipart: vi.fn() }))
vi.mock('./product-variant-selection', () => ({ validateVariantSelectionForProduct: vi.fn() }))

import { getDb } from '../../db/client'
import { parseAtomicVariantMultipart } from './product-atomic-variant-multipart'
import { productAtomicVariantCreateRoute } from './product-atomic-variant-create-route'
import { readProduct } from './product-reader'
import { validateVariantSelectionForProduct } from './product-variant-selection'

function statement() {
  const chain: any = {
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => chain),
    get: vi.fn(async () => ({ id: 7 })),
  }
  return chain
}

function createDb() {
  return {
    insert: vi.fn(statement),
    update: vi.fn(statement),
    select: vi.fn(statement),
    batch: vi.fn(async () => { throw new Error('D1 unavailable') }),
  }
}

const revision = '2026-08-09T00:00:00.000Z'
const env = {
  DB: {},
  CUSTOMIZATION_ASSETS: {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  },
} as never

describe('atomic variant creation D1 failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(createDb() as never)
    vi.mocked(readProduct).mockResolvedValue({
      id: 7,
      updatedAt: revision,
      status: 'draft',
      options: [],
      variants: [],
      customization: null,
    } as never)
    vi.mocked(validateVariantSelectionForProduct).mockResolvedValue(null)
    vi.mocked(parseAtomicVariantMultipart).mockResolvedValue({
      success: true,
      variant: {
        input: { title: 'Blue', optionValueIds: [], attributes: [], priceAmount: null },
        galleryMedia: [{
          id: 'gallery-1',
          fileName: 'gallery.png',
          mimeType: 'image/png',
          widthPx: 20,
          heightPx: 20,
          byteSize: 4,
          buffer: new ArrayBuffer(4),
        }],
        customizationMedia: null,
      },
    } as never)
  })

  it('removes only request-owned R2 uploads when its D1 batch fails', async () => {
    const res = await productAtomicVariantCreateRoute.request('/7/variants/atomic-create', {
      method: 'POST',
      headers: { 'If-Match': revision },
    }, env)

    expect(res.status).toBe(500)
    expect((env as never as { CUSTOMIZATION_ASSETS: { put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.put)
      .toHaveBeenCalledTimes(1)
    expect((env as never as { CUSTOMIZATION_ASSETS: { delete: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.delete)
      .toHaveBeenCalledTimes(1)
  })

  it('rejects Variant creation while a Customization Operation Lease is live', async () => {
    vi.mocked(readProduct).mockResolvedValue({
      id: 7,
      updatedAt: revision,
      status: 'draft',
      options: [],
      variants: [],
      customization: null,
      customizationOperationToken: 'operation-1',
      customizationOperationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    } as never)

    const res = await productAtomicVariantCreateRoute.request('/7/variants/atomic-create', {
      method: 'POST',
      headers: { 'If-Match': revision },
    }, env)

    expect(res.status).toBe(409)
    expect((env as never as { CUSTOMIZATION_ASSETS: { put: ReturnType<typeof vi.fn> } }).CUSTOMIZATION_ASSETS.put)
      .not.toHaveBeenCalled()
  })
})
