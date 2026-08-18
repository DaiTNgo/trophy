import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))
vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))

import { getDb } from '../../db/client'
import { readProduct } from './product-reader'
import { productContentRoute } from './product-content-route'

function createDb() {
  const updates: Array<Record<string, unknown>> = []
  const assetQueue: unknown[] = []
  return {
    updates,
    assetQueue,
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ get: vi.fn(async () => assetQueue.shift()) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    batch: vi.fn(async () => undefined),
    update: vi.fn(() => ({
      set: vi.fn((values) => {
        updates.push(values)
        return { where: vi.fn(async () => undefined) }
      }),
    })),
  }
}

const product = {
  id: 7,
  media: [{ assetId: '11111111-1111-4111-8111-111111111111' }],
  variants: [{ id: 3, media: [{ id: '22222222-2222-4222-8222-222222222222' }], customizationMedia: null }],
}

describe('admin Listing Media route contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assigns distinct default and hover assets and returns the refreshed Product', async () => {
    const db = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValueOnce(product as never).mockResolvedValueOnce({ ...product, thumbnailAssetId: product.media[0].assetId, hoverAssetId: product.variants[0].media[0].id } as never)

    const response = await productContentRoute.request('/7/listing-media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultAssetId: product.media[0].assetId, hoverAssetId: product.variants[0].media[0].id }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      item: { thumbnailAssetId: product.media[0].assetId, hoverAssetId: product.variants[0].media[0].id },
    })
    expect(db.updates).toContainEqual(expect.objectContaining({
      thumbnailAssetId: product.media[0].assetId,
      hoverAssetId: product.variants[0].media[0].id,
    }))
  })

  it('rejects using one asset for both Listing Media roles', async () => {
    const response = await productContentRoute.request('/7/listing-media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultAssetId: '11111111-1111-4111-8111-111111111111',
        hoverAssetId: '11111111-1111-4111-8111-111111111111',
      }),
    })

    expect(response.status).toBe(400)
  })

  it('rejects PDF uploads before writing Listing Media assets', async () => {
    const db = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValue(product as never)
    const form = new FormData()
    form.append('files', new File(['%PDF-1.7'], 'listing-media.pdf', { type: 'application/pdf' }))

    const response = await productContentRoute.request('/7/media/upload', { method: 'POST', body: form })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Only PNG, JPEG, and WEBP images are supported for Listing Media',
    })
  })

  it('permanently removes a directly uploaded Product Media asset and clears its Listing Media role', async () => {
    const db = createDb()
    db.assetQueue.push({ id: product.media[0].assetId, ownerKey: 'catalog:7:media', objectKey: 'catalog/products/7/media/image.webp' })
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValueOnce({ ...product, thumbnailAssetId: product.media[0].assetId, hoverAssetId: null } as never).mockResolvedValueOnce({ ...product, media: [] } as never)
    const assets = { delete: vi.fn(async () => undefined) }

    const response = await productContentRoute.request(`/7/media/${product.media[0].assetId}`, { method: 'DELETE' }, { CUSTOMIZATION_ASSETS: assets } as never)

    expect(response.status).toBe(200)
    expect(assets.delete).toHaveBeenCalledWith('catalog/products/7/media/image.webp')
    expect(db.batch).toHaveBeenCalled()
  })

  it('does not delete an asset owned by a Variant', async () => {
    const db = createDb()
    db.assetQueue.push({ id: product.variants[0].media[0].id, ownerKey: 'catalog:7', objectKey: 'catalog/products/7/variants/3/image.webp' })
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValue(product as never)

    const response = await productContentRoute.request(`/7/media/${product.variants[0].media[0].id}`, { method: 'DELETE' }, { CUSTOMIZATION_ASSETS: { delete: vi.fn() } } as never)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Product Media not found' })
  })

  it('returns not found when the Product does not exist', async () => {
    const db = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValue(null)

    const response = await productContentRoute.request('/7/listing-media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultAssetId: null, hoverAssetId: null }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Product not found' })
  })

  it('rejects an asset not owned by the Product or its Variants', async () => {
    const db = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    vi.mocked(readProduct).mockResolvedValue(product as never)

    const response = await productContentRoute.request('/7/listing-media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultAssetId: '33333333-3333-4333-8333-333333333333', hoverAssetId: null }),
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Listing Media must be a Variant Media, Customization Background, or product-owned media asset',
    })
  })
})
