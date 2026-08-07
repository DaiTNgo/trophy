import { validateProductCustomizationDraft, type ProductCustomization } from '@trophy/customization'
import { asc, eq, inArray } from 'drizzle-orm'
import { upsertTranslations } from '../../lib/catalog-translation'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  productCategories,
  productCategoryLinks,
  productCollections,
  productCustomizations,
  productOptionValues,
  productOptions,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { persistCustomizationTranslations } from '../../lib/customization-translation'
import {
  ensureCustomizationCategory,
  ensureOtherProductsCategory
} from '../../lib/customization-category'
import { enqueueMisaProductSync, syncMisaProductVariants } from './product-misa-sync'
import {
  insertVariantCustomizationMedia,
  insertVariantMedia,
  loadProductAssetsById
} from './product-media'
import { replaceAttributes, replaceOptions } from './product-mutations'
import { readProduct } from './product-reader'
import { replaceVariants } from './product-variant-mutations'
import { validatePublishable } from './product-publishability'
import {
  buildProductCustomizationInsert,
  validateCustomizationPublishReadiness
} from './product-customization-service'
import { normalizeFullCreateDefaultOptionGraph } from './product-default-graph'
import {
  createProductSchema,
  fullCreateProductSchema,
  idParamsSchema,
  nullableLocalizedPatch,
  organizeSchema,
  updateProductSchema
} from './product-schemas'

const DEFAULT_PRODUCT_OPTION_TITLE = 'Default option'
const DEFAULT_PRODUCT_OPTION_VALUE = 'Default option value'

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

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
  table: typeof productCollections | typeof productCategories,
  ids: number[]
) => {
  if (ids.length === 0) {
    return 0
  }

  return (await db.select({ id: table.id }).from(table).where(inArray(table.id, ids))).length
}

const nowIso = () => new Date().toISOString()

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

const loadOptionValueLookup = async (db: ReturnType<typeof getDb>, productId: number) => {
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

const defaultLocalizedText = (value: string) => ({ vi: value, en: value })

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

export const productCommandRoute = new Hono<AppEnv>()
  .post('/', async (c) => {
    const parsed = await parseJson(c, createProductSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const handle = await ensureUniqueHandle(db, parsed.output.handle ?? parsed.output.title.vi)
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

    await upsertTranslations(
      db,
      'product',
      String(insertedProduct.id),
      'title',
      parsed.output.title
    )
    if (parsed.output.subtitle) {
      await upsertTranslations(
        db,
        'product',
        String(insertedProduct.id),
        'subtitle',
        parsed.output.subtitle
      )
    }
    if (parsed.output.description) {
      await upsertTranslations(
        db,
        'product',
        String(insertedProduct.id),
        'description',
        parsed.output.description
      )
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

    const insertedDefaultVariant = await db
      .insert(productVariants)
      .values({
        productId: insertedProduct.id,
        title: defaultVariantTitle,
        sku: null,
        priceAmount: parsed.output.priceAmount ?? null,
        inventoryQuantity: 0,
        allowBackorder: false,
        isDefault: true,
        position: 0,
        updatedAt: nowIso()
      })
      .returning()
      .get()

    await db.insert(productVariantOptionValues).values({
      variantId: insertedDefaultVariant.id,
      optionValueId: insertedDefaultValue.id
    })

    const product = await readProduct(c, db, insertedProduct.id)
    return c.json({ item: product }, 201)
  })
  .post('/full-create', async (c) => {
    const parsed = await parseJson(c, fullCreateProductSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const normalizedInput = normalizeFullCreateDefaultOptionGraph(parsed.output)

    if (
      new Set(
        normalizedInput.options.map((item) =>
          (typeof item.title === 'string' ? item.title : item.title.vi).toLowerCase()
        )
      ).size !== normalizedInput.options.length
    ) {
      return jsonError(c, 409, 'Option titles must be unique')
    }

    const db = getDb(c.env)
    const allAssetIds = [
      ...new Set(
        normalizedInput.variants.flatMap((variant) => [
          ...variant.media.map((media) => media.assetId),
          ...(variant.customizationMedia?.assetId ? [variant.customizationMedia.assetId] : [])
        ])
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
      parsed.output.details.handle ??
        (typeof parsed.output.details.title === 'string'
          ? parsed.output.details.title
          : parsed.output.details.title.vi)
    )

    const insertedProduct = await db
      .insert(products)
      .values({
        title:
          typeof parsed.output.details.title === 'string'
            ? parsed.output.details.title
            : parsed.output.details.title.vi,
        subtitle:
          (typeof parsed.output.details.subtitle === 'string'
            ? parsed.output.details.subtitle
            : parsed.output.details.subtitle?.vi) ?? null,
        handle,
        description:
          (typeof parsed.output.details.description === 'string'
            ? parsed.output.details.description
            : parsed.output.details.description?.vi) ?? null,
        status: 'draft',
        collectionId: parsed.output.organization.collectionId ?? null
      })
      .returning()
      .get()

    await upsertTranslations(
      db,
      'product',
      String(insertedProduct.id),
      'title',
      parsed.output.details.title
    )
    if (parsed.output.details.subtitle) {
      await upsertTranslations(
        db,
        'product',
        String(insertedProduct.id),
        'subtitle',
        parsed.output.details.subtitle
      )
    }
    if (parsed.output.details.description) {
      await upsertTranslations(
        db,
        'product',
        String(insertedProduct.id),
        'description',
        parsed.output.details.description
      )
    }

    let categoryIds = [...new Set(parsed.output.organization.categoryIds ?? [])]
    if (parsed.output.customization?.enabled) {
      const customizationCategory = await ensureCustomizationCategory(db)
      categoryIds = [...new Set([...categoryIds, customizationCategory.id])]
    }
    if (categoryIds.length === 0) {
      const otherProductsCategory = await ensureOtherProductsCategory(db)
      categoryIds = [otherProductsCategory.id]
    }

    if (categoryIds.length > 0) {
      await db.insert(productCategoryLinks).values(
        categoryIds.map((categoryId) => ({
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
      attributes?: Array<{
        name: { vi: string; en?: string | null }
        value: { vi: string; en?: string | null }
        unit?: string | null
      }>
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
        optionValueIds,
        attributes: variant.attributes ?? []
      })
    }

    const replaceVariantsError = await replaceVariants(db, insertedProduct.id, variantInput)
    if (replaceVariantsError) {
      return jsonError(c, replaceVariantsError.status, replaceVariantsError.error)
    }

    const persistedProduct = await readProduct(c, db, insertedProduct.id)
    if (!persistedProduct) {
      return jsonError(c, 500, 'Created product could not be loaded')
    }

    await insertVariantMedia(db, persistedProduct.variants, normalizedInput.variants)
    await insertVariantCustomizationMedia(db, persistedProduct.variants, normalizedInput.variants)

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
      const publishCandidate = await readProduct(c, db, insertedProduct.id)
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

      await syncMisaProductVariants(c, db, publishCandidate)
    }

    const product = await readProduct(c, db, insertedProduct.id)
    return c.json({ item: product }, 201)
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
    const current = await db.select().from(products).where(eq(products.id, params.output.id)).get()

    if (!current) {
      return jsonError(c, 404, 'Product not found')
    }

    const nextTitle = parsed.output.title?.vi ?? current.title
    let nextHandle = current.handle

    if (parsed.output.handle !== undefined) {
      nextHandle = await ensureUniqueHandle(db, parsed.output.handle ?? nextTitle, current.id)
    } else if (!current.handle) {
      nextHandle = await ensureUniqueHandle(db, nextTitle, current.id)
    }

    await db
      .update(products)
      .set({
        title: nextTitle,
        subtitle:
          parsed.output.subtitle !== undefined
            ? (parsed.output.subtitle?.vi ?? null)
            : current.subtitle,
        handle: nextHandle,
        description:
          parsed.output.description !== undefined
            ? (parsed.output.description?.vi ?? null)
            : current.description,
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

    if (parsed.output.title !== undefined) {
      await upsertTranslations(db, 'product', String(current.id), 'title', parsed.output.title)
    }
    if (parsed.output.subtitle !== undefined) {
      await upsertTranslations(
        db,
        'product',
        String(current.id),
        'subtitle',
        nullableLocalizedPatch(parsed.output.subtitle)
      )
    }
    if (parsed.output.description !== undefined) {
      await upsertTranslations(
        db,
        'product',
        String(current.id),
        'description',
        nullableLocalizedPatch(parsed.output.description)
      )
    }

    const product = await readProduct(c, db, current.id)
    if (product && current.status === 'published' && nextTitle !== current.title) {
      enqueueMisaProductSync(c, db, product)
    }
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
    const current = await db.select().from(products).where(eq(products.id, params.output.id)).get()

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
            ? (parsed.output.collectionId ?? null)
            : current.collectionId,
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

    if (parsed.output.categoryIds !== undefined) {
      const currentCustomization = await db
        .select({ enabled: productCustomizations.enabled })
        .from(productCustomizations)
        .where(eq(productCustomizations.productId, current.id))
        .get()
      let categoryIds = [...new Set(parsed.output.categoryIds)]
      if (currentCustomization?.enabled) {
        const customizationCategory = await ensureCustomizationCategory(db)
        categoryIds = [...new Set([...categoryIds, customizationCategory.id])]
      }
      if (categoryIds.length === 0) {
        const otherProductsCategory = await ensureOtherProductsCategory(db)
        categoryIds = [otherProductsCategory.id]
      }

      await db.delete(productCategoryLinks).where(eq(productCategoryLinks.productId, current.id))

      if (categoryIds.length > 0) {
        await db.insert(productCategoryLinks).values(
          categoryIds.map((categoryId) => ({
            productId: current.id,
            categoryId
          }))
        )
      }
    }

    const product = await readProduct(c, db, current.id)
    return c.json({ item: product }, 200)
  })
