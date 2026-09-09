import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/client', () => ({ getDb: vi.fn() }))
vi.mock('./product-reader', () => ({ readProduct: vi.fn() }))

import { getDb } from '../../db/client'
import { readProduct } from './product-reader'
import { productVariantMediaManagementRoute } from './product-variant-media-management-route'

const png1x1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52,
  0, 0, 0, 1, 0, 0, 0, 1
])

describe('productVariantMediaManagementRoute customization-media/replace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects replacement when dimensions mismatch existing canvas dimensions', async () => {
    const mockProduct = {
      id: 7,
      variants: [{ id: 12, customizationMedia: { id: 'old-asset', widthPx: 1190, heightPx: 1683 } }],
      customization: { enabled: true, canvasWidthPx: 1190, canvasHeightPx: 1683 },
    }
    vi.mocked(readProduct).mockResolvedValue(mockProduct as never)
    vi.mocked(getDb).mockReturnValue({} as never)

    const form = new FormData()
    // png1x1 has width 1, height 1 which does not match 1190 x 1683
    form.append('files', new File([png1x1], 'small.png', { type: 'image/png' }))

    const res = await productVariantMediaManagementRoute.request('/7/variants/12/customization-media/replace', {
      method: 'POST',
      body: form,
    })

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Customization Background must be 1190 x 1683 px' })
  })

  it('rejects replacement when PDF has no dimensions and no preview', async () => {
    const mockProduct = {
      id: 7,
      variants: [{ id: 12, customizationMedia: { id: 'old-asset', widthPx: 1190, heightPx: 1683 } }],
      customization: { enabled: true, canvasWidthPx: 1190, canvasHeightPx: 1683 },
    }
    vi.mocked(readProduct).mockResolvedValue(mockProduct as never)
    vi.mocked(getDb).mockReturnValue({} as never)

    const form = new FormData()
    form.append('files', new File(['%PDF-1.7 dummy'], 'doc.pdf', { type: 'application/pdf' }))

    const res = await productVariantMediaManagementRoute.request('/7/variants/12/customization-media/replace', {
      method: 'POST',
      body: form,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Media data is invalid or unsupported' })
  })
})
