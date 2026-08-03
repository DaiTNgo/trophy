import { describe, expect, it, vi } from 'vitest'
import {
  OTHER_PRODUCTS_CATEGORY_HANDLE,
  ensureOtherProductsCategory,
  isSystemProductCategory,
} from './customization-category'

vi.mock('./catalog-translation', () => ({
  upsertTranslations: vi.fn(async () => undefined),
}))

function createMockDb(existing: unknown, created: unknown) {
  const values = vi.fn(() => chain)
  const get = vi.fn()
    .mockResolvedValueOnce(existing)
    .mockResolvedValueOnce(created)
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    values,
    returning: vi.fn(() => chain),
    get,
  }

  return {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    values,
  }
}

describe('Other products category', () => {
  it('treats Custom and Other products as system categories', () => {
    expect(isSystemProductCategory('customization')).toBe(true)
    expect(isSystemProductCategory(OTHER_PRODUCTS_CATEGORY_HANDLE)).toBe(true)
    expect(isSystemProductCategory('trophies')).toBe(false)
  })

  it('creates Other products only when it does not already exist', async () => {
    const db = createMockDb(null, { id: 7 })

    await expect(ensureOtherProductsCategory(db as never)).resolves.toEqual({ id: 7 })
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({
      handle: OTHER_PRODUCTS_CATEGORY_HANDLE,
      name: 'Other products',
    }))
  })

  it('reuses the existing Other products category', async () => {
    const db = createMockDb({ id: 7 }, { id: 8 })

    await expect(ensureOtherProductsCategory(db as never)).resolves.toEqual({ id: 7 })
    expect(db.insert).not.toHaveBeenCalled()
  })
})
