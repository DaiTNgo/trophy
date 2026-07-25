import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { productCategories } from '../db/schema'
import { upsertTranslations } from './catalog-translation'

export const CUSTOMIZATION_CATEGORY_HANDLE = 'customization'
export const CUSTOMIZATION_CATEGORY_LABEL = { vi: 'Tùy chỉnh', en: 'Customization' } as const

export const isCustomizationCategory = (handle: string | null | undefined) =>
  handle === CUSTOMIZATION_CATEGORY_HANDLE

export async function ensureCustomizationCategory(db: Database) {
  const existing = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.handle, CUSTOMIZATION_CATEGORY_HANDLE))
    .get()

  if (existing) {
    return existing
  }

  const created = await db
    .insert(productCategories)
    .values({
      name: CUSTOMIZATION_CATEGORY_LABEL.vi,
      description: 'Sản phẩm có thể tùy chỉnh',
      handle: CUSTOMIZATION_CATEGORY_HANDLE,
      imageUrl: null,
      position: 0,
    })
    .returning()
    .get()

  await upsertTranslations(db, 'product_category', String(created.id), 'name', CUSTOMIZATION_CATEGORY_LABEL)
  await upsertTranslations(db, 'product_category', String(created.id), 'description', {
    vi: 'Sản phẩm có thể tùy chỉnh',
    en: 'Products with customization enabled',
  })

  return created
}
