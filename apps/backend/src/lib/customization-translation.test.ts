import { describe, expect, it } from 'vitest'
import { prepareCustomizationTranslations } from './customization-translation'

describe('prepareCustomizationTranslations', () => {
  it('returns translation writes while normalizing the persisted template without writing D1', () => {
    const customization = {
      layers: [],
      formFields: [{
        id: 'name',
        label: { vi: 'Ten', en: 'Name' },
        helpText: { vi: 'Nhap ten', en: 'Enter a name' },
      }],
    }

    const writes = prepareCustomizationTranslations(customization)

    expect(writes).toEqual([
      expect.objectContaining({ ownerKey: 'name', fieldName: 'label', values: { vi: 'Ten', en: 'Name' } }),
      expect.objectContaining({ ownerKey: 'name', fieldName: 'helpText', values: { vi: 'Nhap ten', en: 'Enter a name' } }),
    ])
    expect(customization.formFields[0]).toMatchObject({ label: 'Ten', helpText: 'Nhap ten' })
  })
})
