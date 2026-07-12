import {
  validateProductCustomizationDraft,
  validateProductCustomizationForPublish,
  type ProductCustomization
} from '@trophy/customization'
import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { hydrateTranslations, upsertTranslations } from '../../lib/catalog-translation'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../../db/client'
import {
  productAttributes,
  productAssets,
  productCategories,
  productCategoryLinks,
  productCollections,
  productCustomizations,
  productMedia,
  productOptionValues,
  productOptions,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import {
  parseStoredProductCustomizationModel
} from './customizations/helpers'
import { hydrateCustomization, persistCustomizationTranslations } from '../../lib/customization-translation'

const DEFAULT_PRODUCT_OPTION_TITLE = 'Default option'
const DEFAULT_PRODUCT_OPTION_VALUE = 'Default option value'
const DEFAULT_PRODUCT_VARIANT_TITLE = 'Default variant'

const trimmedString = (min = 1, max = 255) =>
  v.pipe(v.string(), v.trim(), v.minLength(min), v.maxLength(max))

const nullableText = (max = 65535) =>
  v.optional(
    v.nullable(
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(max),
        v.transform((value) => (value.length === 0 ? null : value))
      )
    )
  )

const optionalHandle = v.optional(
  v.nullable(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(255),
      v.transform((value) => (value.length === 0 ? null : value))
    )
  )
)

const optionalId = v.optional(
  v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))
)

const positiveIntParam = v.pipe(
  v.string(),
  v.transform((input) => Number(input)),
  v.number(),
  v.integer(),
  v.minValue(1)
)

const idParamsSchema = v.object({
  id: positiveIntParam
})

const optionParamsSchema = v.object({
  id: positiveIntParam,
  optionId: positiveIntParam
})

const optionValueParamsSchema = v.object({
  id: positiveIntParam,
  valueId: positiveIntParam
})

const variantParamsSchema = v.object({
  id: positiveIntParam,
  variantId: positiveIntParam
})

const optionalQueryText = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(255),
    v.transform((value) => (value.length === 0 ? undefined : value))
  )
)

const optionalQueryId = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.transform((value) => (value.length === 0 ? undefined : Number(value))),
    v.union([v.undefined(), v.pipe(v.number(), v.integer(), v.minValue(1))])
  )
)

const searchProductsQuerySchema = v.object({
  q: optionalQueryText,
  status: v.optional(
    v.union([
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
      v.pipe(
        v.string(),
        v.trim(),
        v.transform((value) => (value.length === 0 ? undefined : value)),
        v.undefined()
      )
    ])
  ),
  collectionId: optionalQueryId,
  categoryId: optionalQueryId,
  page: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.transform((value) => (value.length === 0 ? 1 : Number(value))),
      v.number(),
      v.integer(),
      v.minValue(1)
    )
  ),
  limit: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.transform((value) => (value.length === 0 ? 20 : Number(value))),
      v.number(),
      v.integer(),
      v.minValue(1),
      v.maxValue(100)
    )
  )
})

import { localizedNullableText, localizedString } from "../../lib/locale"

const optionalLocalizedNullableText = (maxLength = 2000) =>
  v.optional(v.nullable(localizedNullableText(maxLength)))

const nullableLocalizedPatch = (
  value: v.InferOutput<ReturnType<typeof optionalLocalizedNullableText>>
) => value ?? { vi: null, en: null }

const createProductSchema = v.object({
  title: localizedString(1, 200),
  subtitle: optionalLocalizedNullableText(255),
  handle: optionalHandle,
  description: optionalLocalizedNullableText(),
  defaultVariantTitle: nullableText(255),
  priceAmount: v.optional(
    v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
  )
})

const updateProductSchema = v.object({
  title: v.optional(localizedString(1, 200)),
  subtitle: optionalLocalizedNullableText(255),
  handle: optionalHandle,
  description: optionalLocalizedNullableText()
})

const organizeSchema = v.object({
  collectionId: optionalId,
  categoryIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))))
})

const attributesSchema = v.object({
  items: v.array(
    v.object({
      name: localizedString(1, 120),
      value: localizedString(1, 255),
      unit: nullableText(50)
    })
  )
})

const mediaSchema = v.object({
  items: v.array(
    v.object({
      url: trimmedString(1, 2000),
      alt: nullableText(255)
    })
  )
})

const optionsSchema = v.object({
  items: v.array(
    v.object({
      id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
      title: localizedString(1, 120),
      values: v.pipe(
        v.array(
          v.object({
            id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
            value: localizedString(1, 120)
          })
        ),
        v.check(
          (values) => new Set(values.map((vItem) => vItem.value.vi.toLowerCase())).size === values.length,
          'Option values must be unique within the same option'
        )
      )
    })
  )
})

const optionCreateSchema = v.object({
  title: localizedString(1, 120),
  values: v.optional(
    v.pipe(
      v.array(
        v.object({
          value: localizedString(1, 120)
        })
      ),
      v.check(
        (values) => new Set(values.map((vItem) => vItem.value.vi.toLowerCase())).size === values.length,
        'Option values must be unique within the same option'
      )
    )
  )
})

const optionUpdateSchema = v.object({
  title: localizedString(1, 120)
})

const optionValueCreateSchema = v.object({
  value: localizedString(1, 120)
})

const optionValueUpdateSchema = v.object({
  value: localizedString(1, 120)
})

const assetIdSchema = v.pipe(v.string(), v.uuid())
const localizedVariantTitleSchema = v.union([trimmedString(1, 200), localizedString(1, 200)])

const variantsSchema = v.object({
  items: v.array(
    v.object({
      id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
      title: localizedVariantTitleSchema,
      sku: nullableText(120),
      priceAmount: v.optional(
        v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
      ),
      inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
      allowBackorder: v.optional(v.boolean()),
      isDefault: v.optional(v.boolean()),
      optionValueIds: v.optional(
        v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))
      ),
      media: v.optional(
        v.array(
          v.object({
            assetId: assetIdSchema
          })
        )
      )
    })
  )
})

const variantDetailSchema = v.object({
  title: localizedVariantTitleSchema,
  sku: nullableText(120),
  allowBackorder: v.optional(v.boolean()),
  optionValueIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))))
})

const variantCreateSchema = v.object({
  title: localizedVariantTitleSchema,
  sku: nullableText(120),
  priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  allowBackorder: v.optional(v.boolean()),
  optionValueIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  media: v.optional(
    v.array(
      v.object({
        assetId: assetIdSchema
      })
    )
  )
})

const priceUpdateSchema = v.object({
  items: v.pipe(
    v.array(
      v.object({
        id: v.pipe(v.number(), v.integer(), v.minValue(1)),
        priceAmount: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
      })
    ),
    v.minLength(1)
  )
})

const stockUpdateSchema = v.object({
  items: v.pipe(
    v.array(
      v.object({
        id: v.pipe(v.number(), v.integer(), v.minValue(1)),
        inventoryQuantity: v.pipe(v.number(), v.integer(), v.minValue(0))
      })
    ),
    v.minLength(1)
  )
})

const variantMediaSchema = v.object({
  items: v.array(
    v.object({
      assetId: assetIdSchema
    })
  )
})

const fullCreateCustomizationSchema = v.object({
  enabled: v.boolean(),
  canvasWidthPx: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  canvasHeightPx: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  layers: v.pipe(v.array(v.unknown()), v.maxLength(200)),
  formFields: v.pipe(v.array(v.unknown()), v.maxLength(200))
})

const fullCreateOrganizationSchema = v.object({
  collectionId: optionalId,
  categoryIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))))
})

const fullCreateProductSchema = v.object({
  mode: v.union([v.literal('draft'), v.literal('publish')]),
  details: v.object({
    title: localizedString(1, 200),
    subtitle: optionalLocalizedNullableText(255),
    handle: optionalHandle,
    description: optionalLocalizedNullableText()
  }),
  organization: fullCreateOrganizationSchema,
  attributes: v.array(
    v.object({
      name: localizedString(1, 120),
      value: localizedString(1, 255),
      unit: nullableText(50)
    })
  ),
  options: v.array(
    v.object({
      title: localizedString(1, 120),
      values: v.pipe(
        v.array(
          v.object({
            value: localizedString(1, 120)
          })
        ),
        v.check(
          (values) => new Set(values.map((v) => (typeof v.value === 'string' ? v.value : v.value.vi).toLowerCase())).size === values.length,
          'Option values must be unique within the same option'
        )
      )
    })
  ),
  variants: v.array(
    v.object({
      title: localizedVariantTitleSchema,
      sku: nullableText(120),
      priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
      inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
      allowBackorder: v.optional(v.boolean()),
      isDefault: v.optional(v.boolean()),
      optionValues: v.optional(
        v.array(
          v.object({
            optionTitle: trimmedString(1, 120),
            value: trimmedString(1, 120)
          })
        )
      ),
      media: v.array(
        v.object({
          assetId: assetIdSchema
        })
      )
    })
  ),
  customization: v.optional(v.nullable(fullCreateCustomizationSchema))
})

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const ensureArrayUnique = (values: number[]) => new Set(values).size === values.length

const ensureUniqueHandle = async (
  db: ReturnType<typeof getDb>,
  desiredHandle: string,
  excludedProductId?: number
) => {
  const base = slugify(desiredHandle) || 'product'
  let suffix = 0

  while (true) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.handle, candidate))
      .get()

    if (!existing || existing.id === excludedProductId) {
      return candidate
    }

    suffix += 1
  }
}

const getRelatedCount = async (
  db: ReturnType<typeof getDb>,
  table:
    | typeof productCollections
    | typeof productCategories,
  ids: number[]
) => {
  if (ids.length === 0) {
    return 0
  }

  return (await db.select({ id: table.id }).from(table).where(inArray(table.id, ids))).length
}

const readProduct = async (db: ReturnType<typeof getDb>, productId: number) => {
  const product = await db.select().from(products).where(eq(products.id, productId)).get()

  if (!product) {
    return null
  }

  const [
    collection,
    categoryRows,
    attributeRows,
    mediaRows,
    optionRows,
    variantRows,
    variantMediaRows,
    customizationRow
  ] = await Promise.all([
    product.collectionId
      ? db
          .select()
          .from(productCollections)
          .where(eq(productCollections.id, product.collectionId))
          .get()
      : Promise.resolve(null),
    db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        handle: productCategories.handle
      })
      .from(productCategoryLinks)
      .innerJoin(
        productCategories,
        eq(productCategoryLinks.categoryId, productCategories.id)
      )
      .where(eq(productCategoryLinks.productId, productId)),
    db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId))
      .orderBy(asc(productAttributes.position), asc(productAttributes.id)),
    db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(asc(productMedia.position), asc(productMedia.id)),
    db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, productId))
      .orderBy(asc(productOptions.position), asc(productOptions.id)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.position), asc(productVariants.id)),
    db
      .select({
        variantId: productVariantMedia.variantId,
        assetId: productVariantMedia.assetId,
        position: productVariantMedia.position,
        fileName: productAssets.fileName,
        mimeType: productAssets.mimeType,
        widthPx: productAssets.widthPx,
        heightPx: productAssets.heightPx,
        byteSize: productAssets.byteSize
      })
      .from(productVariantMedia)
      .innerJoin(productAssets, eq(productVariantMedia.assetId, productAssets.id))
      .where(
        sql`${productVariantMedia.variantId} in (
          select ${productVariants.id}
          from ${productVariants}
          where ${productVariants.productId} = ${productId}
        )`
      )
      .orderBy(
        asc(productVariantMedia.variantId),
        asc(productVariantMedia.position),
        asc(productVariantMedia.assetId)
      ),
    db
      .select()
      .from(productCustomizations)
      .where(eq(productCustomizations.productId, productId))
      .get()
  ])

  const optionIds = optionRows.map((row) => row.id)
  const variantIds = variantRows.map((row) => row.id)
  const optionValueRows =
    optionIds.length > 0
      ? await db
          .select()
          .from(productOptionValues)
          .where(inArray(productOptionValues.optionId, optionIds))
          .orderBy(asc(productOptionValues.position), asc(productOptionValues.id))
      : []
  const variantOptionRows =
    variantIds.length > 0
      ? await db
          .select()
          .from(productVariantOptionValues)
          .where(inArray(productVariantOptionValues.variantId, variantIds))
      : []

  if (attributeRows.length > 0) {
    await hydrateTranslations(
      db,
      'product_attribute',
      attributeRows,
      (a) => String(a.id),
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'value', objectKey: 'value' }
      ],
      [
        { fieldName: 'name', objectKey: 'name' },
        { fieldName: 'value', objectKey: 'value' }
      ]
    )
  }

  if (optionRows.length > 0) {
    await hydrateTranslations(
      db,
      'product_option',
      optionRows,
      (o) => String(o.id),
      [{ fieldName: 'title', objectKey: 'title' }],
      [{ fieldName: 'title', objectKey: 'title' }]
    )
  }

  if (optionValueRows.length > 0) {
    await hydrateTranslations(
      db,
      'product_option_value',
      optionValueRows,
      (ov) => String(ov.id),
      [{ fieldName: 'value', objectKey: 'value' }],
      [{ fieldName: 'value', objectKey: 'value' }]
    )
  }

  const hydratedVariantRows =
    variantRows.length > 0
      ? await hydrateTranslations(
          db,
          'product_variant',
          variantRows,
          (variant) => String(variant.id),
          [{ fieldName: 'title', objectKey: 'title' }],
          [{ fieldName: 'title', objectKey: 'title' }]
        )
      : variantRows


  const optionValuesByOptionId = new Map<number, typeof optionValueRows>()
  const optionValueById = new Map<number, (typeof optionValueRows)[number]>()
  for (const optionValue of optionValueRows) {
    const current = optionValuesByOptionId.get(optionValue.optionId) ?? []
    current.push(optionValue)
    optionValuesByOptionId.set(optionValue.optionId, current)
    optionValueById.set(optionValue.id, optionValue)
  }

  const optionById = new Map(optionRows.map((row) => [row.id, row]))
  const variantOptionIds = new Map<number, number[]>()
  const variantMediaByVariantId = new Map<number, typeof variantMediaRows>()
  for (const variantOption of variantOptionRows) {
    const current = variantOptionIds.get(variantOption.variantId) ?? []
    current.push(variantOption.optionValueId)
    variantOptionIds.set(variantOption.variantId, current)
  }

  for (const variantMedia of variantMediaRows) {
    const current = variantMediaByVariantId.get(variantMedia.variantId) ?? []
    current.push(variantMedia)
    variantMediaByVariantId.set(variantMedia.variantId, current)
  }

  const customization = customizationRow
    ? (() => {
        const stored = parseStoredProductCustomizationModel(
          JSON.stringify({
            canvasWidthPx: customizationRow.canvasWidthPx,
            canvasHeightPx: customizationRow.canvasHeightPx,
            layers: JSON.parse(customizationRow.layersJson),
            formFields: JSON.parse(customizationRow.formFieldsJson)
          })
        )

        return {
          productId: String(productId),
          enabled: customizationRow.enabled,
          canvasWidthPx: stored.canvasWidthPx,
          canvasHeightPx: stored.canvasHeightPx,
          layers: stored.layers,
          formFields: stored.formFields,
          layerCount: stored.layers.length,
          formFieldCount: stored.formFields.length
        }
      })()
    : null

  if (customization) {
    await hydrateCustomization(db, customization)
  }

  const baseProduct = {
    ...product,
    collection,
    categories: categoryRows,
    attributes: attributeRows,
    media: mediaRows,
    options: optionRows.map((option) => ({
      ...option,
      values: optionValuesByOptionId.get(option.id) ?? []
    })),
    customization,
    variants: hydratedVariantRows.map((variant) => {
      const optionValueIds = (variantOptionIds.get(variant.id) ?? []).sort((a, b) => a - b)

      return {
        ...variant,
        media: (variantMediaByVariantId.get(variant.id) ?? []).map((media) => ({
          id: media.assetId,
          fileName: media.fileName,
          mimeType: media.mimeType,
          widthPx: media.widthPx,
          heightPx: media.heightPx,
          byteSize: media.byteSize,
          position: media.position,
          contentUrl: `/api/assets/products/${media.assetId}/content`
        })),
        optionValueIds,
        optionValues: optionValueIds
          .map((optionValueId) => {
            const optionValue = optionValueById.get(optionValueId)

            if (!optionValue) {
              return null
            }

            const option = optionById.get(optionValue.optionId)

            return {
              id: optionValue.id,
              value: optionValue.value,
              optionId: optionValue.optionId,
              optionTitle: option?.title ?? null
            }
          })
          .filter(Boolean)
      }
    })
  }

  const [hydratedProduct] = await hydrateTranslations(
    db,
    'product',
    [baseProduct],
    (p) => String(p.id),
    [
      { fieldName: 'title', objectKey: 'title' },
      { fieldName: 'subtitle', objectKey: 'subtitle' },
      { fieldName: 'description', objectKey: 'description' }
    ],
    [
      { fieldName: 'title', objectKey: 'title' },
      { fieldName: 'subtitle', objectKey: 'subtitle' },
      { fieldName: 'description', objectKey: 'description' }
    ]
  )

  return hydratedProduct
}

const replaceAttributes = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<any>
) => {
  await db.delete(productAttributes).where(eq(productAttributes.productId, productId))

  if (items.length === 0) {
    return
  }

  const insertedAttributes = await db.insert(productAttributes).values(
    items.map((item, index) => ({
      productId,
      name: typeof item.name === 'string' ? item.name : item.name.vi,
      value: typeof item.value === 'string' ? item.value : item.value.vi,
      unit: item.unit ?? null,
      position: index
    }))
  ).returning()

  for (let i = 0; i < insertedAttributes.length; i++) {
    await upsertTranslations(db, 'product_attribute', String(insertedAttributes[i].id), 'name', items[i].name)
    await upsertTranslations(db, 'product_attribute', String(insertedAttributes[i].id), 'value', items[i].value)
  }
}

const replaceMedia = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<{ url: string; alt?: string | null }>
) => {
  await db.delete(productMedia).where(eq(productMedia.productId, productId))

  if (items.length === 0) {
    return
  }

  await db.insert(productMedia).values(
    items.map((item, index) => ({
      productId,
      url: item.url,
      alt: item.alt ?? null,
      position: index
    }))
  )
}

const replaceOptions = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<any>
) => {
  const product = await db.select().from(products).where(eq(products.id, productId)).get()

  if (!product) {
    return { error: 'Product not found', status: 404 as const }
  }

  const currentVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))

  if (items.length === 0 && currentVariants.length > 1) {
    return {
      error:
        'Cannot disable variant options while the product still has multiple variants',
      status: 409 as const
    }
  }

  const existingOptions = await db
    .select({ id: productOptions.id })
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
  const existingOptionIds = existingOptions.map((row) => row.id)

  if (currentVariants.length > 0) {
    const variantIds = currentVariants.map((row) => row.id)
    await db
      .delete(productVariantOptionValues)
      .where(inArray(productVariantOptionValues.variantId, variantIds))
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

    for (let i = 0; i < insertedOptions.length; i++) {
      await upsertTranslations(db, 'product_option', String(insertedOptions[i].id), 'title', items[i].title)
    }

    const optionValuesPayload = insertedOptions.flatMap((option, optionIndex) =>
      items[optionIndex].values.map((vItem: any, valueIndex: number) => ({
        optionId: option.id,
        value: typeof vItem.value === 'string' ? vItem.value : vItem.value.vi,
        position: valueIndex,
        _originalValue: vItem.value
      }))
    )

    if (optionValuesPayload.length > 0) {
      const insertedValues = await db.insert(productOptionValues).values(optionValuesPayload.map(({ _originalValue, ...rest }) => rest)).returning()
      for (let i = 0; i < insertedValues.length; i++) {
        await upsertTranslations(db, 'product_option_value', String(insertedValues[i].id), 'value', optionValuesPayload[i]._originalValue)
      }
    }
  }

  await db
    .update(products)
    .set({
      updatedAt: nowIso()
    })
    .where(eq(products.id, productId))

  if (items.length === 0 && currentVariants.length === 1) {
    await db
      .update(productVariants)
      .set({
        isDefault: true,
        position: 0,
        updatedAt: nowIso()
      })
      .where(eq(productVariants.id, currentVariants[0].id))
  }

  return null
}

const ensureProductExists = async (db: ReturnType<typeof getDb>, productId: number) =>
  db.select().from(products).where(eq(products.id, productId)).get()

const ensureOptionBelongsToProduct = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  optionId: number
) =>
  db
    .select()
    .from(productOptions)
    .where(and(eq(productOptions.id, optionId), eq(productOptions.productId, productId)))
    .get()

const ensureVariantBelongsToProduct = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  variantId: number
) =>
  db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .get()

const ensureOptionValueBelongsToProduct = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  valueId: number
) =>
  db
    .select({
      id: productOptionValues.id,
      optionId: productOptionValues.optionId,
      value: productOptionValues.value,
      position: productOptionValues.position,
      productId: productOptions.productId,
      optionTitle: productOptions.title
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptionValues.optionId, productOptions.id))
    .where(and(eq(productOptionValues.id, valueId), eq(productOptions.productId, productId)))
    .get()

const updateProductTimestamp = async (db: ReturnType<typeof getDb>, productId: number) => {
  await db
    .update(products)
    .set({ updatedAt: nowIso() })
    .where(eq(products.id, productId))
}

const ensureVariantAssetIdsExist = async (
  db: ReturnType<typeof getDb>,
  assetIds: string[]
) => {
  if (assetIds.length === 0) {
    return null
  }

  const assetsById = await loadProductAssetsById(db, assetIds)
  if (assetsById.size !== assetIds.length) {
    return { error: 'One or more variant media assets were not found', status: 404 as const }
  }

  return null
}

const validateOptionTitleUniquenessForProduct = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  title: string,
  excludedOptionId?: number
) => {
  const optionRows = await db
    .select({ id: productOptions.id, title: productOptions.title })
    .from(productOptions)
    .where(eq(productOptions.productId, productId))

  const normalizedTitle = title.trim().toLowerCase()
  if (
    optionRows.some(
      (row) => row.id !== excludedOptionId && row.title.trim().toLowerCase() === normalizedTitle
    )
  ) {
    return { error: 'Option titles must be unique', status: 409 as const }
  }

  return null
}

const validateOptionValueUniquenessForOption = async (
  db: ReturnType<typeof getDb>,
  optionId: number,
  value: string,
  excludedValueId?: number
) => {
  const optionValueRows = await db
    .select({ id: productOptionValues.id, value: productOptionValues.value })
    .from(productOptionValues)
    .where(eq(productOptionValues.optionId, optionId))

  const normalizedValue = value.trim().toLowerCase()
  if (
    optionValueRows.some(
      (row) => row.id !== excludedValueId && row.value.trim().toLowerCase() === normalizedValue
    )
  ) {
    return {
      error: 'Option values must be unique within the same option',
      status: 409 as const
    }
  }

  return null
}

const validateVariantSelectionForProduct = async ({
  db,
  productId,
  optionValueIds,
  excludedVariantId
}: {
  db: ReturnType<typeof getDb>
  productId: number
  optionValueIds: number[]
  excludedVariantId?: number
}) => {
  const optionRows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id))
  const expectedOptionCount = optionRows.length

  if (expectedOptionCount === 0) {
    if (optionValueIds.length > 0) {
      return {
        error: 'Variant cannot reference option values when the product has no options',
        status: 409 as const
      }
    }

    return null
  }

  if (optionValueIds.length !== expectedOptionCount) {
    return {
      error: 'Each variant must include exactly one value for every option',
      status: 409 as const
    }
  }

  if (!ensureArrayUnique(optionValueIds)) {
    return {
      error: 'Variant option values must be unique',
      status: 409 as const
    }
  }

  const optionValueRows = await db
    .select({
      id: productOptionValues.id,
      optionId: productOptionValues.optionId
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptionValues.optionId, productOptions.id))
    .where(
      and(
        eq(productOptions.productId, productId),
        inArray(productOptionValues.id, optionValueIds)
      )
    )

  if (optionValueRows.length !== optionValueIds.length) {
    return {
      error: 'Variant references an unknown option value',
      status: 409 as const
    }
  }

  const optionIds = optionValueRows.map((row) => row.optionId)
  if (new Set(optionIds).size !== expectedOptionCount) {
    return {
      error: 'Variant must contain at most one value from each option',
      status: 409 as const
    }
  }

  const normalizedOptionValueIds = [...new Set(optionValueIds)].sort((a, b) => a - b)
  const existingVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
  const existingVariantIds = existingVariants
    .map((row) => row.id)
    .filter((variantId) => variantId !== excludedVariantId)

  if (existingVariantIds.length === 0) {
    return null
  }

  const existingSelections = await db
    .select({
      variantId: productVariantOptionValues.variantId,
      optionValueId: productVariantOptionValues.optionValueId
    })
    .from(productVariantOptionValues)
    .where(inArray(productVariantOptionValues.variantId, existingVariantIds))

  const selectionsByVariantId = new Map<number, number[]>()
  for (const selection of existingSelections) {
    const current = selectionsByVariantId.get(selection.variantId) ?? []
    current.push(selection.optionValueId)
    selectionsByVariantId.set(selection.variantId, current)
  }

  const nextKey = normalizedOptionValueIds.join(':')
  for (const variantId of existingVariantIds) {
    const currentKey = (selectionsByVariantId.get(variantId) ?? [])
      .sort((a, b) => a - b)
      .join(':')

    if (currentKey === nextKey) {
      return {
        error: 'Duplicate variant option combination',
        status: 409 as const
      }
    }
  }

  return null
}

const nowIso = () => new Date().toISOString()

const parseQuery = <TOutput>(
  query: Record<string, string | undefined>,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
) => {
  const result = v.safeParse(schema, query)

  if (!result.success) {
    return {
      success: false as const,
      issues: result.issues
    }
  }

  return {
    success: true as const,
    output: result.output
  }
}

const replaceVariants = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<{
    id?: number
    title: string | { vi: string; en?: string | null }
    sku?: string | null
    priceAmount?: number | null
    inventoryQuantity?: number
    allowBackorder?: boolean
    isDefault?: boolean
    optionValueIds?: number[]
    media?: Array<{ assetId: string }>
  }>
) => {
  const product = await db.select().from(products).where(eq(products.id, productId)).get()

  if (!product) {
    return { error: 'Product not found', status: 404 as const }
  }

  if (items.length === 0) {
    return { error: 'A product must have at least one variant', status: 409 as const }
  }

  const optionRows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id))
  const optionIds = optionRows.map((row) => row.id)
  const optionValueRows =
    optionIds.length > 0
      ? await db
          .select()
          .from(productOptionValues)
          .where(inArray(productOptionValues.optionId, optionIds))
      : []

  const optionValueToOptionId = new Map(
    optionValueRows.map((row) => [row.id, row.optionId] as const)
  )

  const computedHasVariants = 
    optionRows.length > 1 || 
    (optionRows.length === 1 && optionRows[0].title !== DEFAULT_PRODUCT_OPTION_TITLE) ||
    (optionRows.length === 1 && optionValueRows.some(v => v.value !== DEFAULT_PRODUCT_OPTION_VALUE));

  if (!computedHasVariants && items.length !== 1) {
    return {
      error: 'Products without variant mode can only have one default variant',
      status: 409 as const
    }
  }

  const normalized = items.map((item, index) => ({
    ...item,
    sku: item.sku ?? null,
    priceAmount: item.priceAmount ?? null,
    inventoryQuantity: item.inventoryQuantity ?? 0,
    allowBackorder: item.allowBackorder ?? false,
    optionValueIds: [...new Set(item.optionValueIds ?? [])].sort((a, b) => a - b),
    isDefault: item.isDefault ?? false,
    position: index
  }))

  const expectedOptionCount = optionRows.length
  const seenCombinations = new Set<string>()

  for (const variant of normalized) {
    if (expectedOptionCount === 0) {
      if (variant.optionValueIds.length > 0) {
        return {
          error: 'Variant cannot reference option values when the product has no options',
          status: 409 as const
        }
      }
      continue
    }

    if (variant.optionValueIds.length !== expectedOptionCount) {
      return {
        error: 'Each variant must include exactly one value for every option',
        status: 409 as const
      }
    }

    if (!ensureArrayUnique(variant.optionValueIds)) {
      return {
        error: 'Variant option values must be unique',
        status: 409 as const
      }
    }

    const optionIdsForVariant = variant.optionValueIds.map((optionValueId) =>
      optionValueToOptionId.get(optionValueId)
    )

    if (optionIdsForVariant.some((value) => value === undefined)) {
      return {
        error: 'Variant references an unknown option value',
        status: 409 as const
      }
    }

    if (new Set(optionIdsForVariant).size !== expectedOptionCount) {
      return {
        error: 'Variant must contain at most one value from each option',
        status: 409 as const
      }
    }

    const combinationKey = variant.optionValueIds.join(':')
    if (seenCombinations.has(combinationKey)) {
      return {
        error: 'Duplicate variant option combination',
        status: 409 as const
      }
    }

    seenCombinations.add(combinationKey)
  }

  if (!computedHasVariants) {
    normalized[0].isDefault = true
  } else {
    if (!normalized.some((variant) => variant.isDefault)) {
      normalized[0].isDefault = true
    }

    let foundDefault = false
    for (const variant of normalized) {
      if (variant.isDefault && !foundDefault) {
        foundDefault = true
      } else {
        variant.isDefault = false
      }
    }
  }

  const existingVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
  const existingVariantIds = existingVariants.map((row) => row.id)

  if (existingVariantIds.length > 0) {
    await db
      .delete(productVariantOptionValues)
      .where(inArray(productVariantOptionValues.variantId, existingVariantIds))
    
    await db
      .delete(productVariantMedia)
      .where(inArray(productVariantMedia.variantId, existingVariantIds))
  }
  await db.delete(productVariants).where(eq(productVariants.productId, productId))

  const insertedVariants = await db
    .insert(productVariants)
    .values(
      normalized.map((item, index) => ({
        productId,
        title: localizedInputValue(item.title),
        sku: item.sku,
        priceAmount: item.priceAmount,
        inventoryQuantity: item.inventoryQuantity,
        allowBackorder: item.allowBackorder,
        isDefault: item.isDefault,
        position: index,
        updatedAt: nowIso()
      }))
    )
    .returning()

  for (let index = 0; index < insertedVariants.length; index += 1) {
    const title = normalized[index].title
    await upsertTranslations(
      db,
      'product_variant',
      String(insertedVariants[index].id),
      'title',
      typeof title === 'string' ? defaultLocalizedText(title) : title
    )
  }

  const variantOptionPayload = insertedVariants.flatMap((variant, index) =>
    normalized[index].optionValueIds.map((optionValueId) => ({
      variantId: variant.id,
      optionValueId
    }))
  )

  if (variantOptionPayload.length > 0) {
    await db.insert(productVariantOptionValues).values(variantOptionPayload)
  }

  const variantsWithMedia = normalized.map((item) => ({ media: item.media ?? [] }))
  await insertVariantMedia(db, insertedVariants, variantsWithMedia)

  return null
}

const validateOrganizeReferences = async (
  db: ReturnType<typeof getDb>,
  input: {
    collectionId?: number | null
    categoryIds?: number[]
  }
) => {
  if (input.collectionId) {
    const count = await getRelatedCount(db, productCollections, [input.collectionId])
    if (count !== 1) {
      return 'Collection not found'
    }
  }

  if (input.categoryIds && input.categoryIds.length > 0) {
    const count = await getRelatedCount(db, productCategories, input.categoryIds)
    if (count !== input.categoryIds.length) {
      return 'One or more categories were not found'
    }
  }

  return null
}

const buildOptionSelectionKey = (optionTitle: string, value: string) =>
  `${optionTitle.trim().toLowerCase()}::${value.trim().toLowerCase()}`

const loadOptionValueLookup = async (
  db: ReturnType<typeof getDb>,
  productId: number
) => {
  const optionRows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id))
  const optionIds = optionRows.map((row) => row.id)
  const optionValueRows =
    optionIds.length > 0
      ? await db
          .select()
          .from(productOptionValues)
          .where(inArray(productOptionValues.optionId, optionIds))
      : []
  const optionById = new Map(optionRows.map((row) => [row.id, row]))

  return new Map(
    optionValueRows.map((row) => {
      const option = optionById.get(row.optionId)
      return [buildOptionSelectionKey(option?.title ?? '', row.value), row.id] as const
    })
  )
}

const loadProductAssetsById = async (
  db: ReturnType<typeof getDb>,
  assetIds: string[]
) => {
  if (assetIds.length === 0) {
    return new Map<string, typeof productAssets.$inferSelect>()
  }

  const assetRows = await db
    .select()
    .from(productAssets)
    .where(inArray(productAssets.id, assetIds))

  return new Map(assetRows.map((asset) => [asset.id, asset]))
}

export const buildVariantMediaInsertRows = (
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ media: Array<{ assetId: string }> }>
) =>
  persistedVariants.flatMap((variant, variantIndex) =>
    submittedVariants[variantIndex].media.map((media, mediaIndex) => ({
      variantId: variant.id,
      assetId: media.assetId,
      position: mediaIndex
    }))
  )

const defaultLocalizedText = (value: string) => ({ vi: value, en: value })

const defaultProductOptionInput = () => ({
  title: defaultLocalizedText(DEFAULT_PRODUCT_OPTION_TITLE),
  values: [{ value: defaultLocalizedText(DEFAULT_PRODUCT_OPTION_VALUE) }]
})

const defaultProductVariantInput = () => ({
  title: DEFAULT_PRODUCT_VARIANT_TITLE,
  sku: null,
  priceAmount: null,
  inventoryQuantity: 0,
  allowBackorder: false,
  isDefault: true,
  optionValues: [
    {
      optionTitle: DEFAULT_PRODUCT_OPTION_TITLE,
      value: DEFAULT_PRODUCT_OPTION_VALUE
    }
  ],
  media: [] as Array<{ assetId: string }>
})

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

const localizedStoredValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'vi' in value && typeof value.vi === 'string') {
    return value.vi
  }

  return ''
}

const productUsesVariantMode = (product: {
  options: Array<{ title: unknown; values: Array<{ value: unknown }> }>
  variants: Array<unknown>
}) =>
  product.options.length > 1 ||
  (product.options.length === 1 &&
    localizedStoredValue(product.options[0]?.title) !== DEFAULT_PRODUCT_OPTION_TITLE) ||
  (product.options.length === 1 &&
    product.options[0]!.values.some(
      (optionValue) => localizedStoredValue(optionValue.value) !== DEFAULT_PRODUCT_OPTION_VALUE
    )) ||
  product.variants.length > 1

const isDefaultOptionInput = (
  options: v.InferOutput<typeof fullCreateProductSchema>['options']
) =>
  options.length === 1 &&
  localizedInputValue(options[0].title) === DEFAULT_PRODUCT_OPTION_TITLE &&
  options[0].values.length === 1 &&
  localizedInputValue(options[0].values[0].value) === DEFAULT_PRODUCT_OPTION_VALUE

const normalizeFullCreateDefaultOptionGraph = (
  input: v.InferOutput<typeof fullCreateProductSchema>
) => {
  const hasCustomOptions = input.options.length > 0 && !isDefaultOptionInput(input.options)
  const options = hasCustomOptions ? input.options : [defaultProductOptionInput()]
  const variants = (input.variants.length > 0 ? input.variants : [defaultProductVariantInput()]).map(
    (variant, index) => ({
      ...variant,
      title: variant.title || DEFAULT_PRODUCT_VARIANT_TITLE,
      isDefault: index === 0 ? true : (variant.isDefault ?? false),
      optionValues:
        !hasCustomOptions && (!variant.optionValues || variant.optionValues.length === 0)
          ? [
              {
                optionTitle: DEFAULT_PRODUCT_OPTION_TITLE,
                value: DEFAULT_PRODUCT_OPTION_VALUE
              }
            ]
          : (variant.optionValues ?? [])
    })
  )

  return { hasCustomOptions, options, variants }
}

const insertVariantMedia = async (
  db: ReturnType<typeof getDb>,
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ media: Array<{ assetId: string }> }>
) => {
  const rows = buildVariantMediaInsertRows(persistedVariants, submittedVariants)

  if (rows.length > 0) {
    await db.insert(productVariantMedia).values(rows)
  }
}

export const deriveCustomizationCanvas = (
  submittedVariants: Array<{ media: Array<{ assetId: string }> }>,
  assetsById: Map<string, typeof productAssets.$inferSelect>
) => {
  for (const variant of submittedVariants) {
    for (const media of variant.media) {
      const asset = assetsById.get(media.assetId)
      if (asset?.widthPx && asset?.heightPx) {
        return {
          canvasWidthPx: asset.widthPx,
          canvasHeightPx: asset.heightPx
        }
      }
    }
  }

  return {
    canvasWidthPx: null,
    canvasHeightPx: null
  }
}

export const buildProductCustomizationInsert = ({
  productId,
  customization,
  submittedVariants,
  assetsById,
  now = nowIso()
}: {
  productId: number
  customization?:
    | NonNullable<v.InferOutput<typeof fullCreateCustomizationSchema>>
    | null
  submittedVariants: v.InferOutput<typeof fullCreateProductSchema>['variants']
  assetsById: Map<string, typeof productAssets.$inferSelect>
  now?: string
}) => {
  if (!customization?.enabled) {
    return null
  }

  const derivedCanvas = deriveCustomizationCanvas(submittedVariants, assetsById)

  return {
    productId,
    enabled: true,
    canvasWidthPx: derivedCanvas.canvasWidthPx,
    canvasHeightPx: derivedCanvas.canvasHeightPx,
    layersJson: JSON.stringify(customization.layers),
    formFieldsJson: JSON.stringify(customization.formFields),
    createdAt: now,
    updatedAt: now
  }
}

export const validateCustomizationPublishReadiness = ({
  customization,
  submittedVariants,
  assetsById
}: {
  customization: NonNullable<v.InferOutput<typeof fullCreateCustomizationSchema>>
  submittedVariants: v.InferOutput<typeof fullCreateProductSchema>['variants']
  assetsById: Map<string, typeof productAssets.$inferSelect>
}) => {
  for (const variant of submittedVariants) {
    if (variant.media.length === 0) {
      return 'Each variant needs at least one image before publish'
    }
  }

  const derivedCanvas = deriveCustomizationCanvas(submittedVariants, assetsById)
  if (!derivedCanvas.canvasWidthPx || !derivedCanvas.canvasHeightPx) {
    return 'Customization requires at least one valid variant image before publish'
  }

  for (const variant of submittedVariants) {
    for (const media of variant.media) {
      const asset = assetsById.get(media.assetId)
      if (!asset?.widthPx || !asset?.heightPx) {
        return 'Customization requires valid image dimensions for every variant image'
      }
      if (
        asset.widthPx !== derivedCanvas.canvasWidthPx ||
        asset.heightPx !== derivedCanvas.canvasHeightPx
      ) {
        return 'All variant images must share the same size before publish'
      }
    }
  }

  const validation = validateProductCustomizationForPublish({
    productId: 'pending',
    enabled: customization.enabled,
    canvasWidthPx: derivedCanvas.canvasWidthPx,
    canvasHeightPx: derivedCanvas.canvasHeightPx,
    layers: customization.layers as ProductCustomization['layers'],
    formFields: customization.formFields as ProductCustomization['formFields']
  })

  if (!validation.valid) {
    return validation.issues[0]?.message ?? 'Customization is invalid'
  }

  return null
}


const isLocComplete = (val: any) => {
  if (typeof val === 'string') return val.trim().length > 0;
  if (!val) return false;
  return (val.vi || '').trim().length > 0 && (val.en || '').trim().length > 0;
}
export const validatePublishable = (product: NonNullable<Awaited<ReturnType<typeof readProduct>>>) => {
  if (!isLocComplete(product.title)) {
    return 'Product title is missing required translations for publish (requires both Vietnamese and English)'
  }

  for (const attr of product.attributes) {
    if (!isLocComplete(attr.name) || !isLocComplete(attr.value)) {
      return 'All product attributes must have translated names and values before publish'
    }
  }

  for (const opt of product.options) {
    if (!isLocComplete(opt.title)) {
      return 'All product options must have translated titles before publish'
    }
    for (const val of opt.values) {
      if (!isLocComplete(val.value)) {
        return 'All product option values must have translated labels before publish'
      }
    }
  }

  if (product.variants.length === 0) {
    return 'A product must have at least one variant'
  }

  for (const variant of product.variants) {
    if (variant.priceAmount === null) {
      return 'Every variant must have a price before publish'
    }
  }

  const expectedOptionCount = product.options.length

  if (!productUsesVariantMode(product)) {
    if (product.variants.length !== 1 || !product.variants[0].isDefault) {
      return 'Products without variants must have exactly one default variant'
    }

    if (product.options.length !== 1 || product.options[0]?.values.length !== 1) {
      return 'Products without variants must have exactly one default option and value'
    }
  }

  const seenCombinations = new Set<string>()

  for (const variant of product.variants) {
    if (variant.optionValueIds.length !== expectedOptionCount) {
      return 'Every variant must include exactly one value for each option'
    }

    const key = [...variant.optionValueIds].sort((a, b) => a - b).join(':')
    if (seenCombinations.has(key)) {
      return 'Variant combinations must be unique'
    }

    seenCombinations.add(key)
  }

  if (product.customization?.enabled) {
    const firstMedia = product.variants.flatMap((variant) => variant.media)[0]

    if (!firstMedia?.widthPx || !firstMedia?.heightPx) {
      return 'Customization requires at least one valid variant image before publish'
    }

    for (const variant of product.variants) {
      if (variant.media.length === 0) {
        return 'Each variant needs at least one image before publish'
      }

      for (const media of variant.media) {
        if (media.widthPx !== firstMedia.widthPx || media.heightPx !== firstMedia.heightPx) {
          return 'All variant images must share the same size before publish'
        }
      }
    }

    const customizationValidation = validateProductCustomizationForPublish({
      productId: String(product.id),
      enabled: true,
      canvasWidthPx: firstMedia.widthPx,
      canvasHeightPx: firstMedia.heightPx,
      layers: product.customization.layers,
      formFields: product.customization.formFields
    })

    if (!customizationValidation.valid) {
      return customizationValidation.issues[0]?.message ?? 'Customization is invalid'
    }
  }

  return null
}

export const productsRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const parsedQuery = parseQuery(c.req.query(), searchProductsQuerySchema)

    if (!parsedQuery.success) {
      return c.json(
        {
          error: 'Validation failed',
          issues: parsedQuery.issues.map((issue) => ({
            message: issue.message ?? 'Invalid value',
            path:
              Array.isArray(issue.path) && issue.path.length > 0 && 'key' in issue.path[0]
                ? String(issue.path[0].key)
                : null
          }))
        },
        400
      )
    }

    const db = getDb(c.env)
    const page = parsedQuery.output.page ?? 1
    const limit = parsedQuery.output.limit ?? 20
    const offset = (page - 1) * limit
    const conditions = []

    if (parsedQuery.output.q) {
      const pattern = `%${parsedQuery.output.q.toLowerCase()}%`
      conditions.push(
        or(
          like(sql`lower(${products.title})`, pattern),
          like(sql`lower(${products.subtitle})`, pattern),
          like(sql`lower(${products.handle})`, pattern)
        )
      )
    }

    if (parsedQuery.output.status) {
      conditions.push(eq(products.status, parsedQuery.output.status))
    }

    if (parsedQuery.output.collectionId) {
      conditions.push(eq(products.collectionId, parsedQuery.output.collectionId))
    }

    if (parsedQuery.output.categoryId) {
      conditions.push(
        sql`exists (
          select 1
          from ${productCategoryLinks}
          where ${productCategoryLinks.productId} = ${products.id}
            and ${productCategoryLinks.categoryId} = ${parsedQuery.output.categoryId}
        )`
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: products.id,
          title: products.title,
          subtitle: products.subtitle,
          handle: products.handle,
          status: products.status,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          collection: {
            id: productCollections.id,
            title: productCollections.title,
            handle: productCollections.handle
          }
        })
        .from(products)
        .leftJoin(
          productCollections,
          eq(products.collectionId, productCollections.id)
        )
        .where(whereClause)
        .orderBy(desc(products.id))
        .limit(limit)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(*)`
        })
        .from(products)
        .where(whereClause)
        .get()
    ])

    return c.json(
      {
        items,
        page,
        limit,
        total: totalResult?.total ?? 0
      },
      200
    )
  })
  .post('/', async (c) => {
    const parsed = await parseJson(c, createProductSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const handle = await ensureUniqueHandle(
      db,
      parsed.output.handle ?? parsed.output.title.vi
    )
    const defaultVariantTitle =
      parsed.output.defaultVariantTitle ?? `${parsed.output.title.vi} Default`
    const insertedProduct = await db
      .insert(products)
      .values({
        title: parsed.output.title.vi,
        subtitle: parsed.output.subtitle?.vi ?? null,
        handle,
        description: parsed.output.description?.vi ?? null,
        status: 'draft'
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product', String(insertedProduct.id), 'title', parsed.output.title)
    if (parsed.output.subtitle) {
      await upsertTranslations(db, 'product', String(insertedProduct.id), 'subtitle', parsed.output.subtitle)
    }
    if (parsed.output.description) {
      await upsertTranslations(db, 'product', String(insertedProduct.id), 'description', parsed.output.description)
    }

    const insertedDefaultOption = await db
      .insert(productOptions)
      .values({
        productId: insertedProduct.id,
        title: DEFAULT_PRODUCT_OPTION_TITLE,
        position: 0
      })
      .returning()
      .get()
    await upsertTranslations(
      db,
      'product_option',
      String(insertedDefaultOption.id),
      'title',
      defaultLocalizedText(DEFAULT_PRODUCT_OPTION_TITLE)
    )

    const insertedDefaultValue = await db
      .insert(productOptionValues)
      .values({
        optionId: insertedDefaultOption.id,
        value: DEFAULT_PRODUCT_OPTION_VALUE,
        position: 0
      })
      .returning()
      .get()
    await upsertTranslations(
      db,
      'product_option_value',
      String(insertedDefaultValue.id),
      'value',
      defaultLocalizedText(DEFAULT_PRODUCT_OPTION_VALUE)
    )

    const insertedDefaultVariant = await db.insert(productVariants).values({
      productId: insertedProduct.id,
      title: defaultVariantTitle,
      sku: null,
      priceAmount: parsed.output.priceAmount ?? null,
      inventoryQuantity: 0,
      allowBackorder: false,
      isDefault: true,
      position: 0,
      updatedAt: nowIso()
    }).returning().get()

    await db.insert(productVariantOptionValues).values({
      variantId: insertedDefaultVariant.id,
      optionValueId: insertedDefaultValue.id
    })

    const product = await readProduct(db, insertedProduct.id)
    return c.json({ item: product }, 201)
  })
  .post('/full-create', async (c) => {
    const parsed = await parseJson(c, fullCreateProductSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const normalizedInput = normalizeFullCreateDefaultOptionGraph(parsed.output)

    if (
      new Set(normalizedInput.options.map((item) => (typeof item.title === 'string' ? item.title : item.title.vi).toLowerCase())).size !==
      normalizedInput.options.length
    ) {
      return jsonError(c, 409, 'Option titles must be unique')
    }

    const db = getDb(c.env)
    const allAssetIds = [
      ...new Set(
        normalizedInput.variants.flatMap((variant) =>
          variant.media.map((media) => media.assetId)
        )
      )
    ]
    const assetsById = await loadProductAssetsById(db, allAssetIds)
    if (assetsById.size !== allAssetIds.length) {
      return jsonError(c, 404, 'One or more variant media assets were not found')
    }

    if (parsed.output.customization?.enabled) {
      const draftValidation = validateProductCustomizationDraft({
        layers: parsed.output.customization.layers as ProductCustomization['layers'],
        formFields: parsed.output.customization.formFields as ProductCustomization['formFields']
      })

      if (!draftValidation.valid) {
        return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization is invalid')
      }

      if (parsed.output.mode === 'publish') {
        const publishCustomizationError = validateCustomizationPublishReadiness({
          customization: parsed.output.customization,
          submittedVariants: normalizedInput.variants,
          assetsById
        })

        if (publishCustomizationError) {
          return jsonError(c, 409, publishCustomizationError)
        }
      }
    }

    const handle = await ensureUniqueHandle(
      db,
      parsed.output.details.handle ?? (typeof parsed.output.details.title === 'string' ? parsed.output.details.title : parsed.output.details.title.vi)
    )

    const insertedProduct = await db
      .insert(products)
      .values({
        title: typeof parsed.output.details.title === 'string' ? parsed.output.details.title : parsed.output.details.title.vi,
        subtitle: (typeof parsed.output.details.subtitle === 'string' ? parsed.output.details.subtitle : parsed.output.details.subtitle?.vi) ?? null,
        handle,
        description: (typeof parsed.output.details.description === 'string' ? parsed.output.details.description : parsed.output.details.description?.vi) ?? null,
        status: 'draft',
        collectionId: parsed.output.organization.collectionId ?? null
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product', String(insertedProduct.id), 'title', parsed.output.details.title)
    if (parsed.output.details.subtitle) {
      await upsertTranslations(db, 'product', String(insertedProduct.id), 'subtitle', parsed.output.details.subtitle)
    }
    if (parsed.output.details.description) {
      await upsertTranslations(db, 'product', String(insertedProduct.id), 'description', parsed.output.details.description)
    }

    if (parsed.output.organization.categoryIds && parsed.output.organization.categoryIds.length > 0) {
      await db.insert(productCategoryLinks).values(
        [...new Set(parsed.output.organization.categoryIds)].map((categoryId) => ({
          productId: insertedProduct.id,
          categoryId
        }))
      )
    }

    await replaceAttributes(db, insertedProduct.id, parsed.output.attributes)

    const replaceOptionsError = await replaceOptions(
      db,
      insertedProduct.id,
      normalizedInput.options
    )
    if (replaceOptionsError) {
      return jsonError(c, replaceOptionsError.status, replaceOptionsError.error)
    }

    const optionValueLookup = await loadOptionValueLookup(db, insertedProduct.id)
    const variantInput = [] as Array<{
      title: string | { vi: string; en?: string | null }
      sku?: string | null
      priceAmount?: number | null
      inventoryQuantity?: number
      allowBackorder?: boolean
      isDefault?: boolean
      optionValueIds?: number[]
    }>

    for (const variant of normalizedInput.variants) {
      const optionValueIds = [] as number[]

      for (const selection of variant.optionValues ?? []) {
        const optionValueId = optionValueLookup.get(
          buildOptionSelectionKey(selection.optionTitle, selection.value)
        )

        if (!optionValueId) {
          return jsonError(
            c,
            409,
            `Variant ${localizedInputValue(variant.title)} references an unknown option value: ${selection.optionTitle} / ${selection.value}`
          )
        }

        optionValueIds.push(optionValueId)
      }

      variantInput.push({
        title: variant.title,
        sku: variant.sku ?? null,
        priceAmount: variant.priceAmount ?? null,
        inventoryQuantity: variant.inventoryQuantity ?? 0,
        allowBackorder: variant.allowBackorder ?? false,
        isDefault: variant.isDefault,
        optionValueIds
      })
    }

    const replaceVariantsError = await replaceVariants(db, insertedProduct.id, variantInput)
    if (replaceVariantsError) {
      return jsonError(c, replaceVariantsError.status, replaceVariantsError.error)
    }

    const persistedProduct = await readProduct(db, insertedProduct.id)
    if (!persistedProduct) {
      return jsonError(c, 500, 'Created product could not be loaded')
    }

    await insertVariantMedia(db, persistedProduct.variants, normalizedInput.variants)

    if (parsed.output.customization?.enabled) {
      const customizationRow = buildProductCustomizationInsert({
        productId: insertedProduct.id,
        customization: parsed.output.customization,
        submittedVariants: normalizedInput.variants,
        assetsById
      })

      if (customizationRow) {
        await persistCustomizationTranslations(db, parsed.output.customization)
        // ensure layersJson/formFieldsJson reflect canonical fields after extraction
        customizationRow.layersJson = JSON.stringify(parsed.output.customization.layers)
        customizationRow.formFieldsJson = JSON.stringify(parsed.output.customization.formFields)
        await db.insert(productCustomizations).values(customizationRow)
      }
    }

    if (parsed.output.mode === 'publish') {
      const publishCandidate = await readProduct(db, insertedProduct.id)
      if (!publishCandidate) {
        return jsonError(c, 500, 'Created product could not be loaded for publish')
      }

      const publishError = validatePublishable(publishCandidate)
      if (publishError) {
        return jsonError(c, 409, publishError)
      }

      await db
        .update(products)
        .set({
          status: 'published',
          updatedAt: nowIso()
        })
        .where(eq(products.id, insertedProduct.id))
    }

    const product = await readProduct(db, insertedProduct.id)
    return c.json({ item: product }, 201)
  })
  .get('/:id', async (c) => {
    const parsed = parseParams(c, idParamsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, parsed.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    return c.json({ item: product }, 200)
  })
  .patch('/:id', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, updateProductSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()

    if (!current) {
      return jsonError(c, 404, 'Product not found')
    }

    const nextTitle = parsed.output.title?.vi ?? current.title
    let nextHandle = current.handle

    if (parsed.output.handle !== undefined) {
      nextHandle = await ensureUniqueHandle(
        db,
        parsed.output.handle ?? nextTitle,
        current.id
      )
    } else if (!current.handle) {
      nextHandle = await ensureUniqueHandle(db, nextTitle, current.id)
    }

    await db
      .update(products)
      .set({
        title: nextTitle,
        subtitle:
          parsed.output.subtitle !== undefined
            ? parsed.output.subtitle?.vi ?? null
            : current.subtitle,
        handle: nextHandle,
        description:
          parsed.output.description !== undefined
            ? parsed.output.description?.vi ?? null
            : current.description,
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

    if (parsed.output.title !== undefined) {
      await upsertTranslations(db, 'product', String(current.id), 'title', parsed.output.title)
    }
    if (parsed.output.subtitle !== undefined) {
      await upsertTranslations(db, 'product', String(current.id), 'subtitle', nullableLocalizedPatch(parsed.output.subtitle))
    }
    if (parsed.output.description !== undefined) {
      await upsertTranslations(db, 'product', String(current.id), 'description', nullableLocalizedPatch(parsed.output.description))
    }

    const product = await readProduct(db, current.id)
    return c.json({ item: product }, 200)
  })
  .patch('/:id/organize', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, organizeSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()

    if (!current) {
      return jsonError(c, 404, 'Product not found')
    }

    const referenceError = await validateOrganizeReferences(db, parsed.output)
    if (referenceError) {
      return jsonError(c, 404, referenceError)
    }

    await db
      .update(products)
      .set({
        collectionId:
          parsed.output.collectionId !== undefined
            ? parsed.output.collectionId ?? null
            : current.collectionId,
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

    if (parsed.output.categoryIds !== undefined) {
      await db
        .delete(productCategoryLinks)
        .where(eq(productCategoryLinks.productId, current.id))

      if (parsed.output.categoryIds.length > 0) {
        await db.insert(productCategoryLinks).values(
          [...new Set(parsed.output.categoryIds)].map((categoryId) => ({
            productId: current.id,
            categoryId
          }))
        )
      }
    }

    const product = await readProduct(db, current.id)
    return c.json({ item: product }, 200)
  })
  .put('/:id/attributes', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, attributesSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()

    if (!exists) {
      return jsonError(c, 404, 'Product not found')
    }

    await replaceAttributes(db, params.output.id, parsed.output.items)
    await db
      .update(products)
      .set({ updatedAt: nowIso() })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .put('/:id/media', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, mediaSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()

    if (!exists) {
      return jsonError(c, 404, 'Product not found')
    }

    await replaceMedia(db, params.output.id, parsed.output.items)
    await db
      .update(products)
      .set({ updatedAt: nowIso() })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .post('/:id/options', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, optionCreateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    if (product.status === 'published') {
      return jsonError(
        c,
        409,
        'Published products cannot add option definitions without rebuilding variants'
      )
    }

    const uniqueTitleError = await validateOptionTitleUniquenessForProduct(
      db,
      product.id,
      parsed.output.title.vi
    )
    if (uniqueTitleError) {
      return jsonError(c, uniqueTitleError.status, uniqueTitleError.error)
    }

    const currentOptions = await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, product.id))

    const insertedOption = await db
      .insert(productOptions)
      .values({
        productId: product.id,
        title: parsed.output.title.vi,
        position: currentOptions.length
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product_option', String(insertedOption.id), 'title', parsed.output.title)

    const values = parsed.output.values ?? []
    if (values.length > 0) {
      const insertedValues = await db.insert(productOptionValues).values(
        values.map((vItem, index) => ({
          optionId: insertedOption.id,
          value: vItem.value.vi,
          position: index
        }))
      ).returning()
      
      for (let i = 0; i < insertedValues.length; i++) {
        await upsertTranslations(db, 'product_option_value', String(insertedValues[i].id), 'value', values[i].value)
      }
    }

    await db
      .update(products)
      .set({
        updatedAt: nowIso()
      })
      .where(eq(products.id, product.id))

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 201)
  })
  .patch('/:id/options/:optionId', async (c) => {
    const params = parseParams(c, optionParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, optionUpdateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)

    if (!option) {
      return jsonError(c, 404, 'Option not found')
    }

    const uniqueTitleError = await validateOptionTitleUniquenessForProduct(
      db,
      params.output.id,
      parsed.output.title.vi,
      option.id
    )
    if (uniqueTitleError) {
      return jsonError(c, uniqueTitleError.status, uniqueTitleError.error)
    }

    await db
      .update(productOptions)
      .set({ title: parsed.output.title.vi })
      .where(eq(productOptions.id, option.id))

    await upsertTranslations(db, 'product_option', String(option.id), 'title', parsed.output.title)

    await db
      .update(products)
      .set({
        updatedAt: nowIso()
      })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .delete('/:id/options/:optionId', async (c) => {
    const params = parseParams(c, optionParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    if (product.status === 'published') {
      return jsonError(
        c,
        409,
        'Published products cannot delete option definitions without rebuilding variants'
      )
    }

    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)

    if (!option) {
      return jsonError(c, 404, 'Option not found')
    }

    const optionValueRows = await db
      .select({ id: productOptionValues.id })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionId, option.id))

    const optionValueIds = optionValueRows.map((row) => row.id)
    if (optionValueIds.length > 0) {
      const referenced = await db
        .select({ variantId: productVariantOptionValues.variantId })
        .from(productVariantOptionValues)
        .where(inArray(productVariantOptionValues.optionValueId, optionValueIds))
        .get()

      if (referenced) {
        return jsonError(c, 409, 'Cannot delete an option that is still used by variants')
      }
    }

    const currentVariants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
    const currentOptions = await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, product.id))

    if (currentOptions.length === 1 && currentVariants.length > 1) {
      return jsonError(
        c,
        409,
        'Cannot disable variant options while the product still has multiple variants'
      )
    }

    if (optionValueIds.length > 0) {
      await db
        .delete(productOptionValues)
        .where(inArray(productOptionValues.id, optionValueIds))
    }
    await db.delete(productOptions).where(eq(productOptions.id, option.id))

    await db
      .update(products)
      .set({
        updatedAt: nowIso()
      })
      .where(eq(products.id, product.id))

    if (currentOptions.length === 1 && currentVariants.length === 1) {
      await db
        .update(productVariants)
        .set({
          isDefault: true,
          position: 0,
          updatedAt: nowIso()
        })
        .where(eq(productVariants.id, currentVariants[0].id))
    }

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .post('/:id/options/:optionId/values', async (c) => {
    const params = parseParams(c, optionParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, optionValueCreateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)

    if (!option) {
      return jsonError(c, 404, 'Option not found')
    }

    const uniqueValueError = await validateOptionValueUniquenessForOption(
      db,
      option.id,
      parsed.output.value.vi
    )
    if (uniqueValueError) {
      return jsonError(c, uniqueValueError.status, uniqueValueError.error)
    }

    const existingValues = await db
      .select({ id: productOptionValues.id })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionId, option.id))

    const insertedValue = await db.insert(productOptionValues).values({
      optionId: option.id,
      value: parsed.output.value.vi,
      position: existingValues.length
    }).returning().get()

    await upsertTranslations(db, 'product_option_value', String(insertedValue.id), 'value', parsed.output.value)

    await db
      .update(products)
      .set({
        updatedAt: nowIso()
      })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 201)
  })
  .patch('/:id/option-values/:valueId', async (c) => {
    const params = parseParams(c, optionValueParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, optionValueUpdateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const optionValue = await ensureOptionValueBelongsToProduct(db, params.output.id, params.output.valueId)

    if (!optionValue) {
      return jsonError(c, 404, 'Option value not found')
    }

    const uniqueValueError = await validateOptionValueUniquenessForOption(
      db,
      optionValue.optionId,
      parsed.output.value.vi,
      optionValue.id
    )
    if (uniqueValueError) {
      return jsonError(c, uniqueValueError.status, uniqueValueError.error)
    }

    await db
      .update(productOptionValues)
      .set({ value: parsed.output.value.vi })
      .where(eq(productOptionValues.id, optionValue.id))

    await upsertTranslations(db, 'product_option_value', String(optionValue.id), 'value', parsed.output.value)

    await db
      .update(products)
      .set({
        updatedAt: nowIso()
      })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .delete('/:id/option-values/:valueId', async (c) => {
    const params = parseParams(c, optionValueParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const optionValue = await ensureOptionValueBelongsToProduct(db, params.output.id, params.output.valueId)

    if (!optionValue) {
      return jsonError(c, 404, 'Option value not found')
    }

    const referenced = await db
      .select({ variantId: productVariantOptionValues.variantId })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.optionValueId, optionValue.id))
      .get()

    if (referenced) {
      return jsonError(c, 409, 'Cannot delete an option value that is still used by variants')
    }

    await db.delete(productOptionValues).where(eq(productOptionValues.id, optionValue.id))
    await updateProductTimestamp(db, params.output.id)

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  // Legacy full-replace option editor. Product detail must use operation-specific option routes.
  .put('/:id/options', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, optionsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    if (
      new Set(parsed.output.items.map((item) => item.title.vi.toLowerCase())).size !==
      parsed.output.items.length
    ) {
      return jsonError(c, 409, 'Option titles must be unique')
    }

    const db = getDb(c.env)
    const replaceError = await replaceOptions(db, params.output.id, parsed.output.items)

    if (replaceError) {
      return jsonError(c, replaceError.status, replaceError.error)
    }

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .patch('/:id/variants/prices', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, priceUpdateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const variantIds = parsed.output.items.map((item) => item.id)
    if (new Set(variantIds).size !== variantIds.length) {
      return jsonError(c, 409, 'Variant ids in a price update must be unique')
    }

    if (
      product.status === 'published' &&
      parsed.output.items.some((item) => item.priceAmount === null)
    ) {
      return jsonError(c, 409, 'Every variant must have a price before publish')
    }

    const existingVariants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
    const existingVariantIds = new Set(existingVariants.map((row) => row.id))

    if (variantIds.some((variantId) => !existingVariantIds.has(variantId))) {
      return jsonError(c, 404, 'One or more variants were not found')
    }

    for (const item of parsed.output.items) {
      await db
        .update(productVariants)
        .set({
          priceAmount: item.priceAmount,
          updatedAt: nowIso()
        })
        .where(and(eq(productVariants.id, item.id), eq(productVariants.productId, product.id)))
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .patch('/:id/variants/stock', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, stockUpdateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const variantIds = parsed.output.items.map((item) => item.id)
    if (new Set(variantIds).size !== variantIds.length) {
      return jsonError(c, 409, 'Variant ids in a stock update must be unique')
    }

    const existingVariants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
    const existingVariantIds = new Set(existingVariants.map((row) => row.id))

    if (variantIds.some((variantId) => !existingVariantIds.has(variantId))) {
      return jsonError(c, 404, 'One or more variants were not found')
    }

    for (const item of parsed.output.items) {
      await db
        .update(productVariants)
        .set({
          inventoryQuantity: item.inventoryQuantity,
          updatedAt: nowIso()
        })
        .where(and(eq(productVariants.id, item.id), eq(productVariants.productId, product.id)))
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .post('/:id/variants', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, variantCreateSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    if (!productUsesVariantMode(product) && product.variants.length >= 1) {
      return jsonError(c, 409, 'Define product options before creating multiple variants')
    }

    const optionValueIds = [...new Set(parsed.output.optionValueIds ?? [])].sort((a, b) => a - b)
    const selectionError = await validateVariantSelectionForProduct({
      db,
      productId: product.id,
      optionValueIds
    })
    if (selectionError) {
      return jsonError(c, selectionError.status, selectionError.error)
    }

    const assetIds = [...new Set((parsed.output.media ?? []).map((item) => item.assetId))]
    const missingAssets = await ensureVariantAssetIdsExist(db, assetIds)
    if (missingAssets) {
      return jsonError(c, missingAssets.status, missingAssets.error)
    }

    if (product.status === 'published' && parsed.output.priceAmount === null) {
      return jsonError(c, 409, 'Every variant must have a price before publish')
    }

    if (product.status === 'published' && product.customization?.enabled && assetIds.length === 0) {
      return jsonError(c, 409, 'Each variant needs at least one image before publish')
    }

    const insertedVariant = await db
      .insert(productVariants)
      .values({
        productId: product.id,
        title: localizedInputValue(parsed.output.title),
        sku: parsed.output.sku ?? null,
        priceAmount: parsed.output.priceAmount ?? null,
        inventoryQuantity: parsed.output.inventoryQuantity ?? 0,
        allowBackorder: parsed.output.allowBackorder ?? false,
        isDefault: false,
        position: product.variants.length,
        updatedAt: nowIso()
      })
      .returning()
      .get()

    await upsertTranslations(
      db,
      'product_variant',
      String(insertedVariant.id),
      'title',
      typeof parsed.output.title === 'string'
        ? defaultLocalizedText(parsed.output.title)
        : parsed.output.title
    )

    if (optionValueIds.length > 0) {
      await db.insert(productVariantOptionValues).values(
        optionValueIds.map((optionValueId) => ({
          variantId: insertedVariant.id,
          optionValueId
        }))
      )
    }

    if (assetIds.length > 0) {
      await db.insert(productVariantMedia).values(
        assetIds.map((assetId, index) => ({
          variantId: insertedVariant.id,
          assetId,
          position: index
        }))
      )
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 201)
  })
  .patch('/:id/variants/:variantId', async (c) => {
    const params = parseParams(c, variantParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, variantDetailSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const variant = await ensureVariantBelongsToProduct(db, product.id, params.output.variantId)
    if (!variant) {
      return jsonError(c, 404, 'Variant not found')
    }

    const currentOptionRows = await db
      .select({ optionValueId: productVariantOptionValues.optionValueId })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.variantId, variant.id))
    const nextOptionValueIds = parsed.output.optionValueIds
      ? [...new Set(parsed.output.optionValueIds)].sort((a, b) => a - b)
      : currentOptionRows.map((row) => row.optionValueId).sort((a, b) => a - b)

    const selectionError = await validateVariantSelectionForProduct({
      db,
      productId: product.id,
      optionValueIds: nextOptionValueIds,
      excludedVariantId: variant.id
    })
    if (selectionError) {
      return jsonError(c, selectionError.status, selectionError.error)
    }

    await db
      .update(productVariants)
      .set({
        title: localizedInputValue(parsed.output.title),
        sku: parsed.output.sku ?? null,
        allowBackorder: parsed.output.allowBackorder ?? variant.allowBackorder,
        updatedAt: nowIso()
      })
      .where(eq(productVariants.id, variant.id))

    await upsertTranslations(
      db,
      'product_variant',
      String(variant.id),
      'title',
      typeof parsed.output.title === 'string'
        ? defaultLocalizedText(parsed.output.title)
        : parsed.output.title
    )

    if (parsed.output.optionValueIds !== undefined) {
      await db
        .delete(productVariantOptionValues)
        .where(eq(productVariantOptionValues.variantId, variant.id))

      if (nextOptionValueIds.length > 0) {
        await db.insert(productVariantOptionValues).values(
          nextOptionValueIds.map((optionValueId) => ({
            variantId: variant.id,
            optionValueId
          }))
        )
      }
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .delete('/:id/variants/:variantId', async (c) => {
    const params = parseParams(c, variantParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) {
      return jsonError(c, 404, 'Variant not found')
    }

    if (product.variants.length === 1) {
      return jsonError(c, 409, 'A product must have at least one variant')
    }

    await db
      .delete(productVariantOptionValues)
      .where(eq(productVariantOptionValues.variantId, variant.id))
    await db
      .delete(productVariantMedia)
      .where(eq(productVariantMedia.variantId, variant.id))
    await db.delete(productVariants).where(eq(productVariants.id, variant.id))

    if (variant.isDefault) {
      const remainingVariants = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.position), asc(productVariants.id))

      if (remainingVariants.length > 0) {
        await db
          .update(productVariants)
          .set({
            isDefault: false,
            updatedAt: nowIso()
          })
          .where(eq(productVariants.productId, product.id))
        await db
          .update(productVariants)
          .set({
            isDefault: true,
            position: 0,
            updatedAt: nowIso()
          })
          .where(eq(productVariants.id, remainingVariants[0].id))
      }
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .put('/:id/variants/:variantId/media', async (c) => {
    const params = parseParams(c, variantParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, variantMediaSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) {
      return jsonError(c, 404, 'Variant not found')
    }

    const assetIds = [...new Set(parsed.output.items.map((item) => item.assetId))]
    const assetLookup = await loadProductAssetsById(db, assetIds)
    if (assetLookup.size !== assetIds.length) {
      return jsonError(c, 404, 'One or more variant media assets were not found')
    }

    if (product.status === 'published' && product.customization?.enabled) {
      const candidate = {
        ...product,
        variants: product.variants.map((item) =>
          item.id === variant.id
            ? {
                ...item,
                media: assetIds.map((assetId, index) => {
                  const asset = assetLookup.get(assetId)!
                  return {
                    id: asset.id,
                    fileName: asset.fileName,
                    mimeType: asset.mimeType,
                    widthPx: asset.widthPx,
                    heightPx: asset.heightPx,
                    byteSize: asset.byteSize,
                    position: index,
                    contentUrl: `/api/assets/products/${asset.id}/content`
                  }
                })
              }
            : item
        )
      }

      const publishError = validatePublishable(
        candidate as NonNullable<Awaited<ReturnType<typeof readProduct>>>
      )
      if (publishError) {
        return jsonError(c, 409, publishError)
      }
    }

    await db
      .delete(productVariantMedia)
      .where(eq(productVariantMedia.variantId, variant.id))

    if (assetIds.length > 0) {
      await db.insert(productVariantMedia).values(
        assetIds.map((assetId, index) => ({
          variantId: variant.id,
          assetId,
          position: index
        }))
      )
    }

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  // Legacy full-replace variant editor. Product detail must use operation-specific variant routes.
  .put('/:id/variants', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, variantsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const existingProduct = await readProduct(db, params.output.id)

    if (!existingProduct) {
      return jsonError(c, 404, 'Product not found')
    }

    if (existingProduct.status === 'published' && existingProduct.customization?.enabled) {
      const candidateVariants = parsed.output.items.map((item, index) => ({
        id: item.id ?? -1,
        title: item.title,
        sku: item.sku,
        priceAmount: item.priceAmount ?? null,
        inventoryQuantity: item.inventoryQuantity ?? 0,
        allowBackorder: item.allowBackorder ?? false,
        isDefault: item.isDefault ?? false,
        position: index,
        options: [],
        media: item.media ?? []
      }))

      const publishError = validatePublishable({
        ...existingProduct,
        variants: candidateVariants
      } as any)

      if (publishError) {
        return jsonError(c, 409, publishError)
      }
    }

    const allAssetIds = [
      ...new Set(
        parsed.output.items.flatMap((variant) =>
          (variant.media ?? []).map((media) => media.assetId)
        )
      )
    ]

    if (allAssetIds.length > 0) {
      const assetsById = await loadProductAssetsById(db, allAssetIds)
      if (assetsById.size !== allAssetIds.length) {
        return jsonError(c, 404, 'One or more variant media assets were not found')
      }
    }

    const replaceError = await replaceVariants(db, params.output.id, parsed.output.items)

    if (replaceError) {
      return jsonError(c, replaceError.status, replaceError.error)
    }

    await db
      .update(products)
      .set({ updatedAt: nowIso() })
      .where(eq(products.id, params.output.id))

    const product = await readProduct(db, params.output.id)
    return c.json({ item: product }, 200)
  })
  .put('/:id/customization', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, fullCreateCustomizationSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    let derivedCanvasWidthPx: number | null = null
    let derivedCanvasHeightPx: number | null = null

    if (parsed.output.enabled) {
      const firstMedia = product.variants.flatMap((variant) => variant.media)[0]
      if (firstMedia?.widthPx && firstMedia?.heightPx) {
        derivedCanvasWidthPx = firstMedia.widthPx
        derivedCanvasHeightPx = firstMedia.heightPx
      }

      const draftValidation = validateProductCustomizationDraft({
        layers: parsed.output.layers as ProductCustomization['layers'],
        formFields: parsed.output.formFields as ProductCustomization['formFields']
      })

      if (!draftValidation.valid) {
        return jsonError(c, 409, draftValidation.issues[0]?.message ?? 'Customization is invalid')
      }
    }

    if (product.status === 'published' && parsed.output.enabled) {
      const publishCandidate = {
        ...product,
        customization: {
          productId: String(product.id),
          enabled: true,
          canvasWidthPx: derivedCanvasWidthPx,
          canvasHeightPx: derivedCanvasHeightPx,
          layers: parsed.output.layers,
          formFields: parsed.output.formFields,
          layerCount: parsed.output.layers.length,
          formFieldCount: parsed.output.formFields.length
        }
      }

      const publishError = validatePublishable(publishCandidate as any)
      if (publishError) {
        return jsonError(c, 409, publishError)
      }
    }

    await db.delete(productCustomizations).where(eq(productCustomizations.productId, product.id))

    if (parsed.output.enabled) {
      await persistCustomizationTranslations(db, parsed.output)

      await db.insert(productCustomizations).values({
        productId: product.id,
        enabled: true,
        canvasWidthPx: derivedCanvasWidthPx,
        canvasHeightPx: derivedCanvasHeightPx,
        layersJson: JSON.stringify(parsed.output.layers),
        formFieldsJson: JSON.stringify(parsed.output.formFields),
        createdAt: nowIso(),
        updatedAt: nowIso()
      })
    }

    await db
      .update(products)
      .set({ updatedAt: nowIso() })
      .where(eq(products.id, product.id))

    const updatedProduct = await readProduct(db, product.id)
    return c.json({ item: updatedProduct }, 200)
  })
  .post('/:id/publish', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const product = await readProduct(db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    const publishError = validatePublishable(product)

    if (publishError) {
      return jsonError(c, 409, publishError)
    }

    await db
      .update(products)
      .set({
        status: 'published',
        updatedAt: nowIso()
      })
      .where(eq(products.id, product.id))

    const publishedProduct = await readProduct(db, product.id)
    return c.json({ item: publishedProduct }, 200)
  })
  .post('/:id/archive', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()

    if (!current) {
      return jsonError(c, 404, 'Product not found')
    }

    await db
      .update(products)
      .set({
        status: 'archived',
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

    const archivedProduct = await readProduct(db, current.id)
    return c.json({ item: archivedProduct }, 200)
  })
