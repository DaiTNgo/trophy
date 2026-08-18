import { describe, expect, it } from 'vitest'
import { parseAtomicVariantMultipart } from './product-atomic-variant-multipart'

function png(width = 1200, height = 900) {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return new File([bytes], 'background.png', { type: 'image/png' })
}

describe('Atomic Variant Creation multipart parser', () => {
  it('parses declared gallery and Customization Background files', async () => {
    const form = new FormData()
    form.append('payload', JSON.stringify({
      title: { vi: 'Blue', en: 'Blue' },
      sku: null,
      priceAmount: 100000,
      inventoryQuantity: 0,
      allowBackorder: false,
      optionValueIds: [3],
      attributes: [],
      galleryMedia: [{ mediaId: 'gallery_1' }],
      customizationMedia: { mediaId: 'background_1', widthPx: 1200, heightPx: 900 }
    }))
    form.append('gallery_1', png())
    form.append('background_1', png())

    const result = await parseAtomicVariantMultipart(new Request('http://example.test', {
      method: 'POST', body: form
    }))

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.variant.galleryMedia).toHaveLength(1)
    expect(result.variant.customizationMedia).toMatchObject({ widthPx: 1200, heightPx: 900 })
  })

  it('rejects files not declared by the payload', async () => {
    const form = new FormData()
    form.append('payload', JSON.stringify({
      title: { vi: 'Blue', en: 'Blue' }, sku: null, priceAmount: 100000,
      inventoryQuantity: 0, allowBackorder: false, optionValueIds: [], attributes: [],
      galleryMedia: [], customizationMedia: null
    }))
    form.append('unexpected', png())

    const result = await parseAtomicVariantMultipart(new Request('http://example.test', {
      method: 'POST', body: form
    }))

    expect(result).toEqual({
      success: false,
      error: 'Each declared media ID must have exactly one matching file and no unreferenced files'
    })
  })
})
