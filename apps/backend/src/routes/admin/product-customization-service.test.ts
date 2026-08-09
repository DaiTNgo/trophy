import { describe, expect, it } from 'vitest'
import {
  deriveCustomizationLifecycle,
  validateBackgroundSizeContract
} from './product-customization-service'

describe('Customization lifecycle', () => {
  it('requires repair only for variants without a valid saved-canvas background', () => {
    const lifecycle = deriveCustomizationLifecycle({
      customization: { enabled: false, canvasWidthPx: 1200, canvasHeightPx: 900 },
      variants: [
        { id: 1, customizationMedia: { widthPx: 1200, heightPx: 900 } },
        { id: 2, customizationMedia: null },
        { id: 3, customizationMedia: { widthPx: 800, heightPx: 600 } }
      ]
    })

    expect(lifecycle).toMatchObject({
      active: false,
      missingBackgroundVariantIds: [2, 3]
    })
  })

  it('rejects a first-time setup with different background dimensions', () => {
    expect(validateBackgroundSizeContract([
      { widthPx: 1200, heightPx: 900 },
      { widthPx: 800, heightPx: 600 }
    ])).toBe('All Customization Backgrounds must share the same size')
  })
})
