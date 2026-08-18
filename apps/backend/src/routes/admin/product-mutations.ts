import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../../db/client'
import {
  productAttributes,
  productOptionValues,
  productOptions,
  productVariantAttributes,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import { upsertTranslations } from '../../lib/catalog-translation'

export async function replaceAttributes(
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<any>
) {
  await db.delete(productAttributes).where(eq(productAttributes.productId, productId))
  if (items.length === 0) return

  const insertedAttributes = await db
    .insert(productAttributes)
    .values(
      items.map((item, index) => ({
        productId,
        name: typeof item.name === 'string' ? item.name : item.name.vi,
        value: typeof item.value === 'string' ? item.value : item.value.vi,
        unit: item.unit ?? null,
        position: index
      }))
    )
    .returning()

  for (let index = 0; index < insertedAttributes.length; index += 1) {
    await upsertTranslations(
      db,
      'product_attribute',
      String(insertedAttributes[index].id),
      'name',
      items[index].name
    )
    await upsertTranslations(
      db,
      'product_attribute',
      String(insertedAttributes[index].id),
      'value',
      items[index].value
    )
  }
}

export async function replaceVariantAttributes(
  db: ReturnType<typeof getDb>,
  variantId: number,
  items: Array<any>
) {
  await db
    .delete(productVariantAttributes)
    .where(eq(productVariantAttributes.variantId, variantId))
  if (items.length === 0) return

  const insertedAttributes = await db
    .insert(productVariantAttributes)
    .values(
      items.map((item, index) => ({
        variantId,
        name: item.name.vi,
        value: item.value.vi,
        unit: item.unit ?? null,
        position: index
      }))
    )
    .returning()

  for (let index = 0; index < insertedAttributes.length; index += 1) {
    const attribute = items[index]
    await upsertTranslations(
      db,
      'product_variant_attribute',
      String(insertedAttributes[index].id),
      'name',
      attribute.name
    )
    await upsertTranslations(
      db,
      'product_variant_attribute',
      String(insertedAttributes[index].id),
      'value',
      attribute.value
    )
  }
}

export async function replaceOptions(
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<any>
) {
  const product = await db.select().from(products).where(eq(products.id, productId)).get()
  if (!product) return { error: 'Product not found', status: 404 as const }

  const currentVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
  if (items.length === 0 && currentVariants.length > 1) {
    return {
      error: 'Cannot disable variant options while the product still has multiple variants',
      status: 409 as const
    }
  }

  const existingOptionIds = (
    await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, productId))
  ).map((row) => row.id)

  if (currentVariants.length > 0) {
    await db
      .delete(productVariantOptionValues)
      .where(inArray(productVariantOptionValues.variantId, currentVariants.map((row) => row.id)))
  }
  if (existingOptionIds.length > 0) {
    await db
      .delete(productOptionValues)
      .where(inArray(productOptionValues.optionId, existingOptionIds))
  }
  await db.delete(productOptions).where(eq(productOptions.productId, productId))

  if (items.length > 0) {
    const insertedOptions = await db
      .insert(productOptions)
      .values(
        items.map((item, index) => ({
          productId,
          title: typeof item.title === 'string' ? item.title : item.title.vi,
          position: index
        }))
      )
      .returning()
    for (let index = 0; index < insertedOptions.length; index += 1) {
      await upsertTranslations(
        db,
        'product_option',
        String(insertedOptions[index].id),
        'title',
        items[index].title
      )
    }

    const optionValuesPayload = insertedOptions.flatMap((option, optionIndex) =>
      items[optionIndex].values.map((valueItem: any, valueIndex: number) => ({
        optionId: option.id,
        value: typeof valueItem.value === 'string' ? valueItem.value : valueItem.value.vi,
        position: valueIndex,
        originalValue: valueItem.value
      }))
    )
    if (optionValuesPayload.length > 0) {
      const insertedValues = await db
        .insert(productOptionValues)
        .values(optionValuesPayload.map(({ originalValue: _originalValue, ...value }) => value))
        .returning()
      for (let index = 0; index < insertedValues.length; index += 1) {
        await upsertTranslations(
          db,
          'product_option_value',
          String(insertedValues[index].id),
          'value',
          optionValuesPayload[index].originalValue
        )
      }
    }
  }

  await db
    .update(products)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId))

  if (items.length === 0 && currentVariants.length === 1) {
    await db
      .update(productVariants)
      .set({ isDefault: true, position: 0, updatedAt: new Date().toISOString() })
      .where(eq(productVariants.id, currentVariants[0].id))
  }

  return null
}
