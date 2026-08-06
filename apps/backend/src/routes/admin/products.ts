import { validateProductCustomizationDraft, type ProductCustomization } from '@trophy/customization'
import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { upsertTranslations } from '../../lib/catalog-translation'
import { Hono } from 'hono'
import { toAbsoluteAssetUrl } from '../../lib/url'
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
  productVariantCustomizationMedia,
  productOptionValues,
  productOptions,
  productVariantMedia,
  productVariantAttributes,
  productVariantOptionValues,
  productVariants,
  products,
  orderItems
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import {
  deleteMisaProducts,
  isMisaConfigured
} from '../../lib/misa'
import { persistCustomizationTranslations } from '../../lib/customization-translation'
import {
  CUSTOMIZATION_CATEGORY_HANDLE,
  ensureCustomizationCategory,
  ensureOtherProductsCategory,
} from '../../lib/customization-category'
import { enqueueMisaProductSync, syncMisaProductVariants } from './product-misa-sync'
import {
  insertVariantCustomizationMedia,
  insertVariantMedia,
  loadProductAssetsById
} from './product-media'
import {
  ensureVariantAssetIdsExist,
  updateProductTimestamp,
} from './product-guards'
import {
  replaceAttributes,
  replaceOptions,
  replaceVariantAttributes
} from './product-mutations'
import { readProduct } from './product-reader'
import { validateVariantSelectionForProduct } from './product-variant-selection'
import { replaceVariants } from './product-variant-mutations'
import { productUsesVariantMode, validatePublishable } from './product-publishability'
import {
  buildProductCustomizationInsert,
  validateCustomizationPublishReadiness
} from './product-customization-service'
import { productContentRoute } from './product-content-route'
import { productOptionDefinitionRoute } from './product-option-definition-route'
import { productOptionReplacementRoute } from './product-option-replacement-route'
import { productOptionValueRoute } from './product-option-value-route'
import { productVariantBatchRoute } from './product-variant-batch-route'
import { productVariantDetailRoute } from './product-variant-detail-route'
import { productVariantDeleteRoute } from './product-variant-delete-route'
import { productVariantMisaRoute } from './product-variant-misa-route'
import { productVariantReplacementRoute } from './product-variant-replacement-route'
import {
  createProductSchema,
  fullCreateCustomizationSchema,
  fullCreateProductSchema,
  idParamsSchema,
  nullableLocalizedPatch,
  organizeSchema,
  searchProductsQuerySchema,
  updateProductSchema,
  variantCreateSchema,
  variantCustomizationMediaSchema,
  variantMediaSchema,
  variantParamsSchema
} from './product-schemas'

const DEFAULT_PRODUCT_OPTION_TITLE = 'Default option'
const DEFAULT_PRODUCT_OPTION_VALUE = 'Default option value'
const DEFAULT_PRODUCT_VARIANT_TITLE = 'Default variant'

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
  attributes: [] as Array<{
    name: { vi: string; en?: string | null }
    value: { vi: string; en?: string | null }
    unit?: string | null
  }>,
  optionValues: [
    {
      optionTitle: DEFAULT_PRODUCT_OPTION_TITLE,
      value: DEFAULT_PRODUCT_OPTION_VALUE
    }
  ],
  media: [] as Array<{ assetId: string }>,
  customizationMedia: null as { assetId: string } | null
})

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

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
      new Set(normalizedInput.options.map((item) => (typeof item.title === 'string' ? item.title : item.title.vi).toLowerCase())).size !==
      normalizedInput.options.length
    ) {
      return jsonError(c, 409, 'Option titles must be unique')
    }

    const db = getDb(c.env)
    const allAssetIds = [
      ...new Set(
        normalizedInput.variants.flatMap((variant) =>
          [
            ...variant.media.map((media) => media.assetId),
            ...(variant.customizationMedia?.assetId ? [variant.customizationMedia.assetId] : [])
          ]
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
  .get('/:id', async (c) => {
    const parsed = parseParams(c, idParamsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(c, db, parsed.output.id)

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

      await db
        .delete(productCategoryLinks)
        .where(eq(productCategoryLinks.productId, current.id))

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
  .route('/', productContentRoute)
  .route('/', productOptionDefinitionRoute)
  .route('/', productOptionValueRoute)
  .route('/', productOptionReplacementRoute)
  .route('/', productVariantBatchRoute)
  .route('/', productVariantDetailRoute)
  .route('/', productVariantDeleteRoute)
  .route('/', productVariantMisaRoute)
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
    const product = await readProduct(c, db, params.output.id)

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

    const assetIds = [
      ...new Set([
        ...(parsed.output.media ?? []).map((item) => item.assetId),
        ...(parsed.output.customizationMedia?.assetId ? [parsed.output.customizationMedia.assetId] : [])
      ])
    ]
    const missingAssets = await ensureVariantAssetIdsExist(db, assetIds)
    if (missingAssets) {
      return jsonError(c, missingAssets.status, missingAssets.error)
    }

    if (product.status === 'published' && parsed.output.priceAmount === null) {
      return jsonError(c, 409, 'Every variant must have a price before publish')
    }

    if (product.status === 'published' && product.customization?.enabled && !parsed.output.customizationMedia?.assetId) {
      return jsonError(c, 409, 'Each variant needs Customization Media before publish')
    }

    if (product.status === 'published' && product.customization?.enabled) {
      const nextAsset = await loadProductAssetsById(db, [parsed.output.customizationMedia!.assetId])
      const dimensions = nextAsset.get(parsed.output.customizationMedia!.assetId)
      const expected = product.variants.find((item) => item.customizationMedia)?.customizationMedia
      if (!dimensions?.widthPx || !dimensions.heightPx) {
        return jsonError(c, 409, 'Customization Media must have valid dimensions before publish')
      }
      if (expected && (dimensions.widthPx !== expected.widthPx || dimensions.heightPx !== expected.heightPx)) {
        return jsonError(c, 409, 'Customization Media must match the existing canvas size before publish')
      }
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

    const galleryAssetIds = [...new Set((parsed.output.media ?? []).map((item) => item.assetId))]
    if (galleryAssetIds.length > 0) {
      await db.insert(productVariantMedia).values(
        galleryAssetIds.map((assetId, index) => ({
          variantId: insertedVariant.id,
          assetId,
          position: index
        }))
      )
    }

    if (parsed.output.customizationMedia?.assetId) {
      await db.insert(productVariantCustomizationMedia).values({
        variantId: insertedVariant.id,
        assetId: parsed.output.customizationMedia.assetId
      })
    }

    await replaceVariantAttributes(
      db,
      insertedVariant.id,
      parsed.output.attributes ?? []
    )

    await updateProductTimestamp(db, product.id)

    const nextProduct = await readProduct(c, db, product.id)
    if (nextProduct && product.status === 'published') {
      const inserted = nextProduct.variants.find((item) => item.id === insertedVariant.id)
      if (inserted) await syncMisaProductVariants(c, db, nextProduct, [inserted])
    }
    const syncedProduct = product.status === 'published'
      ? await readProduct(c, db, product.id)
      : nextProduct
    return c.json({ item: syncedProduct }, 201)
  })
  .put('/:id/variants/:variantId/customization-media', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) {
      return params.response
    }

    const parsed = await parseJson(c, variantCustomizationMediaSchema)
    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }
    if (!product.customization?.enabled) {
      return jsonError(c, 409, 'Customization is disabled for this product')
    }

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) {
      return jsonError(c, 404, 'Variant not found')
    }

    const asset = await db
      .select()
      .from(productAssets)
      .where(eq(productAssets.id, parsed.output.assetId))
      .get()
    if (!asset) {
      return jsonError(c, 404, 'Customization Media asset not found')
    }
    if (!asset.widthPx || !asset.heightPx) {
      return jsonError(c, 422, 'Customization Media must have valid dimensions')
    }

    const otherCanvas = product.variants.find(
      (item) => item.id !== variant.id && item.customizationMedia
    )?.customizationMedia
    if (
      otherCanvas &&
      (asset.widthPx !== otherCanvas.widthPx || asset.heightPx !== otherCanvas.heightPx)
    ) {
      return jsonError(c, 409, 'Customization Media must match the existing canvas size')
    }

    if (product.status === 'published') {
      const candidate = {
        ...product,
        variants: product.variants.map((item) =>
          item.id === variant.id
            ? { ...item, customizationMedia: asset }
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

    const previousAssetId = variant.customizationMedia?.id ?? null
    await db
      .delete(productVariantCustomizationMedia)
      .where(eq(productVariantCustomizationMedia.variantId, variant.id))
    await db.insert(productVariantCustomizationMedia).values({
      variantId: variant.id,
      assetId: asset.id,
      updatedAt: nowIso()
    })
    await updateProductTimestamp(db, product.id)

    if (previousAssetId && previousAssetId !== asset.id) {
      const previousAsset = await db
        .select()
        .from(productAssets)
        .where(eq(productAssets.id, previousAssetId))
        .get()
      if (previousAsset) {
        await c.env.CUSTOMIZATION_ASSETS.delete(previousAsset.objectKey)
        await db.delete(productAssets).where(eq(productAssets.id, previousAsset.id))
      }
    }

    const nextProduct = await readProduct(c, db, product.id)
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
    const product = await readProduct(c, db, params.output.id)

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
                    contentUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${asset.id}/content`) as string
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

    const nextProduct = await readProduct(c, db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .route('/', productVariantReplacementRoute)
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
    const product = await readProduct(c, db, params.output.id)

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    let derivedCanvasWidthPx: number | null = null
    let derivedCanvasHeightPx: number | null = null

    if (parsed.output.enabled) {
      const firstMedia = product.variants.find((variant) => variant.customizationMedia)?.customizationMedia
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
      const customizationCategory = await ensureCustomizationCategory(db)
      const linkedCategory = await db
        .select({ categoryId: productCategoryLinks.categoryId })
        .from(productCategoryLinks)
        .where(
          and(
            eq(productCategoryLinks.productId, product.id),
            eq(productCategoryLinks.categoryId, customizationCategory.id)
          )
        )
        .get()
      if (!linkedCategory) {
        await db.insert(productCategoryLinks).values({
          productId: product.id,
          categoryId: customizationCategory.id,
        })
      }

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

    if (!parsed.output.enabled) {
      const customizationCategory = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(eq(productCategories.handle, CUSTOMIZATION_CATEGORY_HANDLE))
        .get()
      if (customizationCategory) {
        await db
          .delete(productCategoryLinks)
          .where(
            and(
              eq(productCategoryLinks.productId, product.id),
              eq(productCategoryLinks.categoryId, customizationCategory.id)
            )
          )
      }
    }

    await db
      .update(products)
      .set({ updatedAt: nowIso() })
      .where(eq(products.id, product.id))

    const updatedProduct = await readProduct(c, db, product.id)
    return c.json({ item: updatedProduct }, 200)
  })
  .post('/:id/publish', async (c) => {
    const params = parseParams(c, idParamsSchema)

    if (!params.success) {
      return params.response
    }

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)

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

    await syncMisaProductVariants(c, db, product)
    const publishedProduct = await readProduct(c, db, product.id)
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

    const archivedProduct = await readProduct(c, db, current.id)
    return c.json({ item: archivedProduct }, 200)
  })
  .delete('/:id', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const current = await db.select().from(products).where(eq(products.id, params.output.id)).get()
    if (!current) return jsonError(c, 404, 'Product not found')

    const ordered = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, current.id)).get()
    if (ordered) return jsonError(c, 409, 'Product cannot be deleted because it is used by an order')

    const product = await readProduct(c, db, current.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const variants = product.variants
    const storedIds = variants
      .filter((variant) => variant.misaSyncStatus === 'synced')
      .map((variant) => variant.misaProductId)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
    if (storedIds.length > 0) {
      if (!isMisaConfigured(c.env)) return jsonError(c, 503, 'MISA integration is not configured')
      try {
        await deleteMisaProducts(c.env, storedIds)
      } catch (error) {
        return jsonError(c, 502, error instanceof Error ? error.message : 'Unable to delete MISA products')
      }
    }

    const optionRows = await db.select({ id: productOptions.id }).from(productOptions).where(eq(productOptions.productId, current.id))
    const optionIds = optionRows.map((row) => row.id)
    const valueRows = optionIds.length > 0
      ? await db.select({ id: productOptionValues.id }).from(productOptionValues).where(inArray(productOptionValues.optionId, optionIds))
      : []
    const valueIds = valueRows.map((row) => row.id)
    const variantIds = variants.map((variant) => variant.id)
    if (variantIds.length > 0) {
      await db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.variantId, variantIds))
      await db.delete(productVariantAttributes).where(inArray(productVariantAttributes.variantId, variantIds))
      await db.delete(productVariantMedia).where(inArray(productVariantMedia.variantId, variantIds))
      await db.delete(productVariantCustomizationMedia).where(inArray(productVariantCustomizationMedia.variantId, variantIds))
    }
    if (valueIds.length > 0) await db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.optionValueId, valueIds))
    if (optionIds.length > 0) await db.delete(productOptionValues).where(inArray(productOptionValues.optionId, optionIds))
    await db.delete(productVariants).where(eq(productVariants.productId, current.id))
    await db.delete(productOptions).where(eq(productOptions.productId, current.id))
    await db.delete(productAttributes).where(eq(productAttributes.productId, current.id))
    await db.delete(productMedia).where(eq(productMedia.productId, current.id))
    await db.delete(productCustomizations).where(eq(productCustomizations.productId, current.id))
    await db.delete(productCategoryLinks).where(eq(productCategoryLinks.productId, current.id))
    await db.delete(products).where(eq(products.id, current.id))
    return c.json({ deleted: true, id: current.id }, 200)
  })
