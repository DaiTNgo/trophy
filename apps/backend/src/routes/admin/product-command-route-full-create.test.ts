import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))
vi.mock('../../lib/catalog-translation', () => ({ upsertTranslations: vi.fn(async () => undefined) }))
vi.mock('../../lib/customization-translation', () => ({ persistCustomizationTranslations: vi.fn(async () => undefined) }))
vi.mock('../../lib/customization-category', () => ({
  ensureCustomizationCategory: vi.fn(async () => ({ id: 1 })),
  ensureOtherProductsCategory: vi.fn(async () => ({ id: 1 })),
}))
vi.mock('./product-misa-sync', () => ({ enqueueMisaProductSync: vi.fn(), syncMisaProductVariants: vi.fn() }))
vi.mock('./product-mutations', () => ({ replaceAttributes: vi.fn(async () => undefined), replaceOptions: vi.fn(async () => null) }))
vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))
vi.mock('./product-variant-mutations', () => ({ replaceVariants: vi.fn(async () => null) }))
vi.mock('./product-full-create-multipart', () => ({
  parseFullCreateMultipart: vi.fn(),
  extensionForMimeType: vi.fn(() => 'png'),
  fullCreateAssetInput: vi.fn((media, objectKey, productId) => ({
    id: media.id,
    ownerKey: `catalog:${productId}`,
    objectKey,
    fileName: media.fileName,
    mimeType: media.mimeType,
    widthPx: media.widthPx,
    heightPx: media.heightPx,
    byteSize: media.byteSize,
  })),
}))
vi.mock('./product-default-graph', () => ({ normalizeFullCreateDefaultOptionGraph: vi.fn((input) => input) }))

import { getDb } from '../../db/client'
import { parseFullCreateMultipart } from './product-full-create-multipart'
import { readProduct } from './product-reader'
import { productCommandRoute } from './product-command-route'

type VariantInput = {
  title: string
  media: Array<{ mediaId: string }>
  customizationMedia?: { mediaId: string } | null
}

function createDb({ failThumbnailUpdate = false } = {}) {
  const updates: Array<Record<string, unknown>> = []
  const insertChain: any = {
    values: vi.fn(() => insertChain),
    returning: vi.fn(() => insertChain),
    onConflictDoUpdate: vi.fn(() => insertChain),
    get: vi.fn(async () => ({ id: 71 })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve),
  }
  const selectChain: any = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    orderBy: vi.fn(() => selectChain),
    get: vi.fn(async () => null),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve),
  }
  const updateChain: any = {
    set: vi.fn((value: Record<string, unknown>) => {
      updates.push(value)
      return updateChain
    }),
    where: vi.fn(() => updateChain),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      (failThumbnailUpdate
        ? Promise.reject(new Error('thumbnail update failed'))
        : Promise.resolve([])
      ).then(resolve, reject),
  }

  return {
    db: {
      insert: vi.fn(() => insertChain),
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
      delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    },
    updates,
  }
}

function media(id: string) {
  return {
    id,
    fieldId: id,
    fileName: `${id}.png`,
    mimeType: 'image/png',
    widthPx: 100,
    heightPx: 100,
    byteSize: 12,
    buffer: new ArrayBuffer(12),
  }
}

function queueFullCreate(variants: VariantInput[]) {
  const allMedia = variants.flatMap((variant) => [
    ...variant.media.map((item) => item.mediaId),
    ...(variant.customizationMedia ? [variant.customizationMedia.mediaId] : []),
  ])
  vi.mocked(parseFullCreateMultipart).mockResolvedValue({
    success: true,
    input: {
      mode: 'draft',
      details: { title: 'Cup', handle: 'cup' },
      organization: { categoryIds: [1] },
      attributes: [],
      options: [],
      variants: variants.map((variant, index) => ({
        ...variant,
        sku: null,
        priceAmount: null,
        inventoryQuantity: 0,
        allowBackorder: false,
        isDefault: index === 0,
        optionValues: [],
        attributes: [],
      })),
      customization: null,
    },
    media: new Map(allMedia.map((id) => [id, media(id)])),
  } as never)
  vi.mocked(readProduct)
    .mockResolvedValueOnce({ id: 71, variants: variants.map((_variant, index) => ({ id: index + 1 })) } as never)
    .mockResolvedValueOnce({ id: 71, thumbnailAssetId: null } as never)
}

describe('admin full-create initial product thumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('references customization media before gallery media', async () => {
    const { db, updates } = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    queueFullCreate([{ title: 'First', media: [{ mediaId: 'gallery-first' }], customizationMedia: { mediaId: 'background-first' } }])

    const response = await productCommandRoute.request('/full-create', { method: 'POST' }, { CUSTOMIZATION_ASSETS: { put: vi.fn() } } as never)

    expect(response.status, await response.text()).toBe(201)
    expect(updates).toContainEqual(expect.objectContaining({ thumbnailAssetId: 'background-first' }))
  })

  it('references the first gallery media when the first variant has no customization media', async () => {
    const { db, updates } = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    queueFullCreate([{ title: 'First', media: [{ mediaId: 'gallery-first' }, { mediaId: 'gallery-second' }] }])

    const response = await productCommandRoute.request('/full-create', { method: 'POST' }, { CUSTOMIZATION_ASSETS: { put: vi.fn() } } as never)

    expect(response.status, await response.text()).toBe(201)
    expect(updates).toContainEqual(expect.objectContaining({ thumbnailAssetId: 'gallery-first' }))
  })

  it('creates the product without a thumbnail when no variant media exists', async () => {
    const { db, updates } = createDb()
    vi.mocked(getDb).mockReturnValue(db as never)
    queueFullCreate([{ title: 'First', media: [] }])

    const response = await productCommandRoute.request('/full-create', { method: 'POST' }, { CUSTOMIZATION_ASSETS: { put: vi.fn() } } as never)

    expect(response.status).toBe(201)
    expect(updates.some((update) => 'thumbnailAssetId' in update)).toBe(false)
  })

  it('keeps full-create successful when thumbnail assignment fails', async () => {
    const { db } = createDb({ failThumbnailUpdate: true })
    vi.mocked(getDb).mockReturnValue(db as never)
    queueFullCreate([{ title: 'First', media: [{ mediaId: 'gallery-first' }] }])
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await productCommandRoute.request('/full-create', { method: 'POST' }, { CUSTOMIZATION_ASSETS: { put: vi.fn() } } as never)

    expect(response.status).toBe(201)
    expect(error).toHaveBeenCalledWith('initial product thumbnail assignment failed', expect.objectContaining({ productId: 71, assetId: 'gallery-first' }))
  })
})
