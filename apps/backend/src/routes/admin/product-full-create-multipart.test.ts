import { describe, expect, it } from 'vitest'
import { parseFullCreateMultipart } from './product-full-create-multipart'

const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52,
  0, 0, 0, 1, 0, 0, 0, 1
])
const mediaId = 'pending_11111111-1111-4111-8111-111111111111'

const payload = {
  mode: 'draft', details: { title: { vi: 'Cup', en: '' }, handle: null }, organization: {}, attributes: [], options: [],
  variants: [{ title: 'Default', sku: null, media: [{ mediaId }], customizationMedia: null }]
}

describe('parseFullCreateMultipart', () => {
  it('accepts one declared file and derives image dimensions before persistence', async () => {
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    form.append(mediaId, new File([png], 'cup.png', { type: 'image/png' }))
    const result = await parseFullCreateMultipart(new Request('https://test/products/full-create', { method: 'POST', body: form }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.media.get(mediaId)).toMatchObject({ fileName: 'cup.png', widthPx: 1, heightPx: 1 })
  })

  it('rejects missing and unreferenced multipart files before persistence', async () => {
    const missing = new FormData()
    missing.append('payload', JSON.stringify(payload))
    await expect(parseFullCreateMultipart(new Request('https://test/products/full-create', { method: 'POST', body: missing }))).resolves.toMatchObject({ success: false })

    const extra = new FormData()
    extra.append('payload', JSON.stringify(payload))
    extra.append(mediaId, new File([png], 'cup.png', { type: 'image/png' }))
    extra.append('22222222-2222-4222-8222-222222222222', new File([png], 'extra.png', { type: 'image/png' }))
    await expect(parseFullCreateMultipart(new Request('https://test/products/full-create', { method: 'POST', body: extra }))).resolves.toMatchObject({ success: false })
  })
})
