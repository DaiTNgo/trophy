import { describe, expect, it, vi } from 'vitest'
import {
  insertFullCreateOptions,
  insertFullCreateVariants,
  persistFullCreateTranslations,
  queueFullCreateTranslations,
} from './product-full-create-persistence'

function createDb(returningRows: unknown[][]) {
  const values = [] as unknown[]
  const chain: any = {
    values: vi.fn((value: unknown) => {
      values.push(value)
      return chain
    }),
    returning: vi.fn(async () => returningRows.shift() ?? []),
    onConflictDoUpdate: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve),
  }
  return {
    db: {
      insert: vi.fn(() => chain),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    values,
  }
}

describe('full-create persistence', () => {
  it('creates options and variants without querying or replacing empty product state', async () => {
    const { db, values } = createDb([
      [{ id: 10 }],
      [{ id: 100 }],
      [{ id: 20 }],
    ])
    const translations: Parameters<typeof queueFullCreateTranslations>[0] = []

    const lookup = await insertFullCreateOptions(db as never, 7, [
      { title: { vi: 'Size', en: 'Size' }, values: [{ value: { vi: 'L', en: 'Large' } }] },
    ], translations)
    const variants = await insertFullCreateVariants(db as never, 7, [
      { title: { vi: 'Large', en: 'Large' }, optionValueIds: [lookup.get('size::l')!] },
    ], translations)

    expect(variants).toEqual([{ id: 20 }])
    expect(values).toHaveLength(4)
    expect(db.select).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('persists all full-create translations through one multi-row upsert', async () => {
    const { db, values } = createDb([])
    const translations: Parameters<typeof queueFullCreateTranslations>[0] = []
    queueFullCreateTranslations(translations, 'product', '7', 'title', { vi: 'Cúp', en: 'Cup' })
    queueFullCreateTranslations(translations, 'product_variant', '20', 'title', { vi: 'Vàng', en: 'Gold' })

    await persistFullCreateTranslations(db as never, translations)

    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(values[0]).toHaveLength(4)
    expect(db.select).not.toHaveBeenCalled()
  })
})
