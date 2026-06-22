import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import * as v from 'valibot'
import { getDb } from '../db/client'
import {
  productAttributes,
  productCategories,
  productCategoryLinks,
  productCollections,
  productMedia,
  productOptionValues,
  productOptions,
  productTagLinks,
  productTags,
  productTypes,
  productVariantOptionValues,
  productVariants,
  products
} from '../db/schema'
import type { AppEnv } from '../lib/env'
import { jsonError, parseJson, parseParams } from '../lib/validation'

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

const idParamsSchema = v.object({
  id: v.pipe(
    v.string(),
    v.transform((input) => Number(input)),
    v.number(),
    v.integer(),
    v.minValue(1)
  )
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
  typeId: optionalQueryId,
  collectionId: optionalQueryId,
  categoryId: optionalQueryId,
  tagId: optionalQueryId,
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

const createProductSchema = v.object({
  title: trimmedString(1, 200),
  subtitle: nullableText(255),
  handle: optionalHandle,
  description: nullableText(),
  defaultVariantTitle: nullableText(255),
  priceAmount: v.optional(
    v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
  )
})

const updateProductSchema = v.object({
  title: v.optional(trimmedString(1, 200)),
  subtitle: nullableText(255),
  handle: optionalHandle,
  description: nullableText()
})

const organizeSchema = v.object({
  typeId: optionalId,
  collectionId: optionalId,
  categoryIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  tagIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))))
})

const attributesSchema = v.object({
  items: v.array(
    v.object({
      name: trimmedString(1, 120),
      value: trimmedString(1, 255),
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
      title: trimmedString(1, 120),
      values: v.pipe(
        v.array(trimmedString(1, 120)),
        v.check(
          (values) => new Set(values.map((value) => value.toLowerCase())).size === values.length,
          'Option values must be unique within the same option'
        )
      )
    })
  )
})

const variantsSchema = v.object({
  items: v.array(
    v.object({
      id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
      title: trimmedString(1, 200),
      sku: nullableText(120),
      priceAmount: v.optional(
        v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))
      ),
      isDefault: v.optional(v.boolean()),
      optionValueIds: v.optional(
        v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))
      )
    })
  )
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
    | typeof productTypes
    | typeof productCollections
    | typeof productCategories
    | typeof productTags,
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
    type,
    collection,
    categoryRows,
    tagRows,
    attributeRows,
    mediaRows,
    optionRows,
    variantRows
  ] = await Promise.all([
    product.typeId
      ? db.select().from(productTypes).where(eq(productTypes.id, product.typeId)).get()
      : Promise.resolve(null),
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
        handle: productCategories.handle,
        parentId: productCategories.parentId
      })
      .from(productCategoryLinks)
      .innerJoin(
        productCategories,
        eq(productCategoryLinks.categoryId, productCategories.id)
      )
      .where(eq(productCategoryLinks.productId, productId)),
    db
      .select({
        id: productTags.id,
        value: productTags.value
      })
      .from(productTagLinks)
      .innerJoin(productTags, eq(productTagLinks.tagId, productTags.id))
      .where(eq(productTagLinks.productId, productId)),
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
      .orderBy(asc(productVariants.position), asc(productVariants.id))
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
  for (const variantOption of variantOptionRows) {
    const current = variantOptionIds.get(variantOption.variantId) ?? []
    current.push(variantOption.optionValueId)
    variantOptionIds.set(variantOption.variantId, current)
  }

  return {
    ...product,
    type,
    collection,
    categories: categoryRows,
    tags: tagRows,
    attributes: attributeRows,
    media: mediaRows,
    options: optionRows.map((option) => ({
      ...option,
      values: optionValuesByOptionId.get(option.id) ?? []
    })),
    variants: variantRows.map((variant) => {
      const optionValueIds = (variantOptionIds.get(variant.id) ?? []).sort((a, b) => a - b)

      return {
        ...variant,
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
}

const replaceAttributes = async (
  db: ReturnType<typeof getDb>,
  productId: number,
  items: Array<{ name: string; value: string; unit?: string | null }>
) => {
  await db.delete(productAttributes).where(eq(productAttributes.productId, productId))

  if (items.length === 0) {
    return
  }

  await db.insert(productAttributes).values(
    items.map((item, index) => ({
      productId,
      name: item.name,
      value: item.value,
      unit: item.unit ?? null,
      position: index
    }))
  )
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
  items: Array<{ title: string; values: string[] }>
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
          title: item.title,
          position: index
        }))
      )
      .returning()

    const optionValuesPayload = insertedOptions.flatMap((option, optionIndex) =>
      items[optionIndex].values.map((value, valueIndex) => ({
        optionId: option.id,
        value,
        position: valueIndex
      }))
    )

    if (optionValuesPayload.length > 0) {
      await db.insert(productOptionValues).values(optionValuesPayload)
    }
  }

  await db
    .update(products)
    .set({
      hasVariants: items.length > 0,
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
    title: string
    sku?: string | null
    priceAmount?: number | null
    isDefault?: boolean
    optionValueIds?: number[]
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

  if (!product.hasVariants && items.length !== 1) {
    return {
      error: 'Products without variant mode can only have one default variant',
      status: 409 as const
    }
  }

  const normalized = items.map((item, index) => ({
    ...item,
    sku: item.sku ?? null,
    priceAmount: item.priceAmount ?? null,
    optionValueIds: [...new Set(item.optionValueIds ?? [])].sort((a, b) => a - b),
    isDefault: item.isDefault ?? false,
    position: index
  }))

  if (!product.hasVariants) {
    if (normalized[0].optionValueIds.length > 0) {
      return {
        error: 'Default variant cannot reference option values when variants are disabled',
        status: 409 as const
      }
    }

    normalized[0].isDefault = true
  } else {
    if (optionRows.length === 0) {
      return {
        error: 'Define product options before saving multiple variants',
        status: 409 as const
      }
    }

    const expectedOptionCount = optionRows.length
    const seenCombinations = new Set<string>()

    for (const variant of normalized) {
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
  }
  await db.delete(productVariants).where(eq(productVariants.productId, productId))

  const insertedVariants = await db
    .insert(productVariants)
    .values(
      normalized.map((item, index) => ({
        productId,
        title: item.title,
        sku: item.sku,
        priceAmount: item.priceAmount,
        isDefault: item.isDefault,
        position: index,
        updatedAt: nowIso()
      }))
    )
    .returning()

  const variantOptionPayload = insertedVariants.flatMap((variant, index) =>
    normalized[index].optionValueIds.map((optionValueId) => ({
      variantId: variant.id,
      optionValueId
    }))
  )

  if (variantOptionPayload.length > 0) {
    await db.insert(productVariantOptionValues).values(variantOptionPayload)
  }

  return null
}

const validateOrganizeReferences = async (
  db: ReturnType<typeof getDb>,
  input: {
    typeId?: number | null
    collectionId?: number | null
    categoryIds?: number[]
    tagIds?: number[]
  }
) => {
  if (input.typeId) {
    const count = await getRelatedCount(db, productTypes, [input.typeId])
    if (count !== 1) {
      return 'Type not found'
    }
  }

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

  if (input.tagIds && input.tagIds.length > 0) {
    const count = await getRelatedCount(db, productTags, input.tagIds)
    if (count !== input.tagIds.length) {
      return 'One or more tags were not found'
    }
  }

  return null
}

const validatePublishable = (product: NonNullable<Awaited<ReturnType<typeof readProduct>>>) => {
  if (product.title.trim().length === 0) {
    return 'Product title is required'
  }

  if (product.variants.length === 0) {
    return 'A product must have at least one variant'
  }

  for (const variant of product.variants) {
    if (variant.priceAmount === null) {
      return 'Every variant must have a price before publish'
    }
  }

  if (!product.hasVariants) {
    if (product.variants.length !== 1 || !product.variants[0].isDefault) {
      return 'Products without variants must have exactly one default variant'
    }

    if (product.variants[0].optionValueIds.length > 0) {
      return 'Default variant cannot contain option values when variants are disabled'
    }
  } else {
    const expectedOptionCount = product.options.length
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

    if (parsedQuery.output.typeId) {
      conditions.push(eq(products.typeId, parsedQuery.output.typeId))
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

    if (parsedQuery.output.tagId) {
      conditions.push(
        sql`exists (
          select 1
          from ${productTagLinks}
          where ${productTagLinks.productId} = ${products.id}
            and ${productTagLinks.tagId} = ${parsedQuery.output.tagId}
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
          hasVariants: products.hasVariants,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          type: {
            id: productTypes.id,
            value: productTypes.value
          },
          collection: {
            id: productCollections.id,
            title: productCollections.title,
            handle: productCollections.handle
          }
        })
        .from(products)
        .leftJoin(productTypes, eq(products.typeId, productTypes.id))
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
      parsed.output.handle ?? parsed.output.title
    )
    const defaultVariantTitle =
      parsed.output.defaultVariantTitle ?? `${parsed.output.title} Default`
    const insertedProduct = await db
      .insert(products)
      .values({
        title: parsed.output.title,
        subtitle: parsed.output.subtitle ?? null,
        handle,
        description: parsed.output.description ?? null,
        status: 'draft',
        hasVariants: false
      })
      .returning()
      .get()

    await db.insert(productVariants).values({
      productId: insertedProduct.id,
      title: defaultVariantTitle,
      sku: null,
      priceAmount: parsed.output.priceAmount ?? null,
      isDefault: true,
      position: 0,
      updatedAt: nowIso()
    })

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

    const nextTitle = parsed.output.title ?? current.title
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
            ? parsed.output.subtitle ?? null
            : current.subtitle,
        handle: nextHandle,
        description:
          parsed.output.description !== undefined
            ? parsed.output.description ?? null
            : current.description,
        updatedAt: nowIso()
      })
      .where(eq(products.id, current.id))

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
        typeId:
          parsed.output.typeId !== undefined
            ? parsed.output.typeId ?? null
            : current.typeId,
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

    if (parsed.output.tagIds !== undefined) {
      await db.delete(productTagLinks).where(eq(productTagLinks.productId, current.id))

      if (parsed.output.tagIds.length > 0) {
        await db.insert(productTagLinks).values(
          [...new Set(parsed.output.tagIds)].map((tagId) => ({
            productId: current.id,
            tagId
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
      new Set(parsed.output.items.map((item) => item.title.toLowerCase())).size !==
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
