import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { toAbsoluteAssetUrl } from '../../lib/url'
import * as v from 'valibot'
import {
  buildRuntimeImageClipartLayer,
  getFormFieldForLayer,
  type CustomizationFormField,
  type CustomizationLayer,
  type ProductCustomization,
} from "@trophy/customization";
import { getDb } from '../../db/client'
import {
  productAttributes,
  productAssets,
  customizationClipartAssets,
  customizationClipartCategories,
  productCategories,
  productCategoryLinks,
  productCustomizations,
  productOptions,
  productOptionValues,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { hydrateTranslations } from '../../lib/catalog-translation'
import { hydrateCustomization } from '../../lib/customization-translation'
import { localeSchema, DEFAULT_LOCALE } from '../../lib/locale'

const optionalQueryText = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(255),
    v.transform((value) => (value.length === 0 ? undefined : value))
  )
)

const storefrontListingQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
  q: optionalQueryText,
  category: optionalQueryText,
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

const handleQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE)
})

const handleParamsSchema = v.object({
  handle: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(255)
  )
})

function parseQuery<TOutput>(
  query: Record<string, string | undefined>,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
) {
  const result = v.safeParse(schema, query)

  if (!result.success) {
    return {
      success: false as const,
      issues: result.issues.map((issue) => ({
        message: issue.message ?? 'Invalid value',
        path: Array.isArray(issue.path) && issue.path.length > 0 && 'key' in issue.path[0]
          ? String(issue.path[0].key)
          : null
      }))
    }
  }

  return { success: true as const, output: result.output }
}

export function sanitizeShopperCustomization(customization: ProductCustomization) {
  const clipartCategoriesById = new Map<
    string,
    { id: string; name: string }
  >();
  const clipartAssetsByCategoryId = new Map<string, Array<any>>();

  return sanitizeShopperCustomizationWithClipart(customization, {
    clipartCategoriesById,
    clipartAssetsByCategoryId,
  });
}

function sanitizeShopperCustomizationWithClipart(
  customization: ProductCustomization,
  {
    clipartCategoriesById,
    clipartAssetsByCategoryId,
  }: {
    clipartCategoriesById: Map<string, { id: string; name: string }>;
    clipartAssetsByCategoryId: Map<string, Array<any>>;
  },
) {
  return {
    enabled: customization.enabled,
    canvasWidthPx: customization.canvasWidthPx,
    canvasHeightPx: customization.canvasHeightPx,
    layers: customization.layers.map((layer) => {
      if (layer.type !== "image_shape") {
        return layer;
      }

      const field = getFormFieldForLayer(
        {
          id: "runtime",
          productId: customization.productId,
          name: "runtime",
          revision: 1,
          status: "published",
          background: null,
          layers: customization.layers,
          formFields: customization.formFields,
        },
        layer.id,
      );

      const runtime = buildRuntimeImageClipartLayer({
        layer,
        fieldId: field?.id,
        required: field?.required ?? false,
        clipartCategoriesById,
        clipartAssets: (() => {
          const categoryIds = runtimeCategoryIds(layer, clipartCategoriesById);
          const derivedAssets = categoryIds.flatMap(
            (categoryId) => clipartAssetsByCategoryId.get(categoryId) ?? [],
          );
          if (derivedAssets.length > 0) {
            return derivedAssets.filter(
              (asset, index, array) => array.findIndex((candidate) => candidate.id === asset.id) === index,
            );
          }
          return layer.clipartAssets ?? [];
        })(),
      });

      return {
        ...layer,
        sourcePolicy: runtime.sourcePolicy,
        presentation: runtime.presentation,
        clipartCategoryMode: runtime.clipartCategoryMode,
        clipartCategory: runtime.clipartCategory,
        allowedClipartCategories: runtime.allowedClipartCategories,
        clipartAssets: runtime.clipartAssets,
        upload: runtime.upload,
      };
    }) as CustomizationLayer[],
    formFields: customization.formFields,
  };
}

function runtimeCategoryIds(
  layer: ProductCustomization["layers"][number],
  clipartCategoriesById: Map<string, { id: string; name: string }>,
) {
  if (layer.type !== "image_shape") return [];
  const clipartCategoryMode = layer.clipartCategoryMode ?? "fixed";
  if (clipartCategoryMode === "allow_list") {
    return (layer.allowedClipartCategories ?? [])
      .map((category) => clipartCategoriesById.get(category.id)?.id ?? category.id);
  }
  return layer.clipartCategory ? [clipartCategoriesById.get(layer.clipartCategory.id)?.id ?? layer.clipartCategory.id] : [];
}

export const storefrontProductsRoute = new Hono<AppEnv>()
  .get('/', async (c) => {
    const parsedQuery = parseQuery(c.req.query(), storefrontListingQuerySchema)

    if (!parsedQuery.success) {
      return c.json({ error: 'Validation failed', issues: parsedQuery.issues }, 400)
    }

    const db = getDb(c.env)
    const page = parsedQuery.output.page ?? 1
    const limit = parsedQuery.output.limit ?? 20
    const locale = parsedQuery.output.locale ?? DEFAULT_LOCALE
    const offset = (page - 1) * limit

    const conditions = [eq(products.status, 'published')]

    if (parsedQuery.output.q) {
      const pattern = `%${parsedQuery.output.q.toLowerCase()}%`
      conditions.push(
        sql`(
          lower(${products.title}) like ${pattern}
          or lower(${products.subtitle}) like ${pattern}
          or lower(${products.handle}) like ${pattern}
          or exists (
            select 1
            from ${productCategoryLinks}
            inner join ${productCategories}
              on ${productCategories.id} = ${productCategoryLinks.categoryId}
            where ${productCategoryLinks.productId} = ${products.id}
              and lower(${productCategories.name}) like ${pattern}
          )
        )`
      )
    }

    if (parsedQuery.output.category) {
      conditions.push(
        sql`exists (
          select 1
          from ${productCategoryLinks}
          inner join ${productCategories}
            on ${productCategories.id} = ${productCategoryLinks.categoryId}
          where ${productCategoryLinks.productId} = ${products.id}
            and ${productCategories.handle} = ${parsedQuery.output.category}
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
          status: products.status
        })
        .from(products)
        .where(whereClause)
        .orderBy(desc(products.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(products)
        .where(whereClause)
        .get()
    ])

    const productIds = items.map((item) => item.id)

    const [categoryRows, variantRows, variantMediaRows, customizationRows] = await Promise.all([
      productIds.length > 0
        ? db
            .select({
              productId: productCategoryLinks.productId,
              categoryId: productCategories.id,
              name: productCategories.name
            })
            .from(productCategoryLinks)
            .innerJoin(
              productCategories,
              eq(productCategoryLinks.categoryId, productCategories.id)
            )
            .where(inArray(productCategoryLinks.productId, productIds))
        : Promise.resolve([] as Array<{ productId: number; categoryId: number; name: string }>),
      productIds.length > 0
        ? db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.productId, productIds))
            .orderBy(asc(productVariants.position), asc(productVariants.id))
        : Promise.resolve([] as Array<typeof productVariants.$inferSelect>),
      productIds.length > 0
        ? db
            .select({
              variantId: productVariantMedia.variantId,
              assetId: productVariantMedia.assetId,
              position: productVariantMedia.position,
              productId: productVariants.productId
            })
            .from(productVariantMedia)
            .innerJoin(productVariants, eq(productVariantMedia.variantId, productVariants.id))
            .where(inArray(productVariants.productId, productIds))
            .orderBy(
              asc(productVariantMedia.variantId),
              asc(productVariantMedia.position),
              asc(productVariantMedia.assetId)
            )
        : Promise.resolve(
            [] as Array<{
              variantId: number
              assetId: string
              position: number
              productId: number
            }>
          ),
      productIds.length > 0
        ? db
            .select({
              productId: productCustomizations.productId,
              enabled: productCustomizations.enabled
            })
            .from(productCustomizations)
            .where(inArray(productCustomizations.productId, productIds))
        : Promise.resolve([] as Array<{ productId: number; enabled: boolean }>)
    ])

    const variantMediaByVariantId = new Map<
      number,
      (typeof variantMediaRows)[number][]
    >()
    for (const row of variantMediaRows) {
      const current = variantMediaByVariantId.get(row.variantId) ?? []
      current.push(row)
      variantMediaByVariantId.set(row.variantId, current)
    }

    const customizationByProductId = new Map(
      customizationRows.map((row) => [row.productId, row])
    )

    const variantsByProductId = new Map<number, (typeof variantRows)[number][]>()
    for (const row of variantRows) {
      const current = variantsByProductId.get(row.productId) ?? []
      current.push(row)
      variantsByProductId.set(row.productId, current)
    }

    
    const resolvedItems = await hydrateTranslations(db, 'product', items, i => String(i.id), [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}], [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}]);
    const resolvedCategories = await hydrateTranslations(db, 'product_category', categoryRows, c => String(c.categoryId), [{fieldName: 'name', objectKey: 'name'}], [{fieldName: 'name', objectKey: 'name'}]);

    const categoriesByProductId = new Map<number, string[]>()
    for (const row of resolvedCategories) {
      const current = categoriesByProductId.get(row.productId) ?? []
      current.push(row.name)
      categoriesByProductId.set(row.productId, current)
    }

    const listingItems = resolvedItems.map((item) =>
      buildListingItem(
        c,
        item,
        categoriesByProductId.get(item.id) ?? [],
        variantsByProductId.get(item.id) ?? [],
        variantMediaByVariantId,
        customizationByProductId.get(item.id)?.enabled ?? false
      )
    )

    return c.json(
      {
        items: listingItems,
        page,
        limit,
        total: totalResult?.total ?? 0
      },
      200
    )
  })
  .get('/:handle', async (c) => {
    const parsed = parseParams(c, handleParamsSchema)

    if (!parsed.success) {
      return parsed.response
    }

    const db = getDb(c.env)
    const handle = parsed.output.handle

    const parsedQuery = parseQuery(c.req.query(), handleQuerySchema)
    const locale = parsedQuery.success ? (parsedQuery.output.locale ?? DEFAULT_LOCALE) : DEFAULT_LOCALE

    let product = await db
      .select()
      .from(products)
      .where(and(eq(products.handle, handle), eq(products.status, 'published')))
      .get()

    if (!product) {
      return jsonError(c, 404, 'Product not found')
    }

    [product] = await hydrateTranslations(db, 'product', [product], p => String(p.id), [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}, {fieldName: 'description', objectKey: 'description'}], [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}, {fieldName: 'description', objectKey: 'description'}
      ]);

    const [
      categoryRows,
      attributeRows,
      optionRows,
      variantRows,
      variantMediaRows,
      customizationRow
    ] = await Promise.all([
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
        .where(eq(productCategoryLinks.productId, product.id)),
      db
        .select()
        .from(productAttributes)
        .where(eq(productAttributes.productId, product.id))
        .orderBy(asc(productAttributes.position), asc(productAttributes.id)),
      db
        .select()
        .from(productOptions)
        .where(eq(productOptions.productId, product.id))
        .orderBy(asc(productOptions.position), asc(productOptions.id)),
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
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
          where ${productVariants.productId} = ${product.id}
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
        .where(eq(productCustomizations.productId, product.id))
        .get()
    ])

    
    const resolvedCategories = await hydrateTranslations(db, 'product_category', categoryRows, c => String(c.id), [{fieldName: 'name', objectKey: 'name'}], [{fieldName: 'name', objectKey: 'name'}]);
    const resolvedAttributes = await hydrateTranslations(db, 'product_attribute', attributeRows, a => String(a.id), [{fieldName: 'name', objectKey: 'name'}, {fieldName: 'value', objectKey: 'value'}], [{fieldName: 'name', objectKey: 'name'}, {fieldName: 'value', objectKey: 'value'}]);
    const resolvedOptions = await hydrateTranslations(db, 'product_option', optionRows, o => String(o.id), [{fieldName: 'title', objectKey: 'title'}], [{fieldName: 'title', objectKey: 'title'}]);
    const optionIds = resolvedOptions.map((row) => row.id)
    const variantIds = variantRows.map((row) => row.id)

    const [rawOptionValueRows, variantOptionRows] = await Promise.all([
      optionIds.length > 0
        ? db
            .select()
            .from(productOptionValues)
            .where(inArray(productOptionValues.optionId, optionIds))
            .orderBy(asc(productOptionValues.position), asc(productOptionValues.id))
        : Promise.resolve([] as Array<typeof productOptionValues.$inferSelect>),
      variantIds.length > 0
        ? db
            .select()
            .from(productVariantOptionValues)
            .where(inArray(productVariantOptionValues.variantId, variantIds))
        : Promise.resolve([] as Array<typeof productVariantOptionValues.$inferSelect>)
    ])

    
    const optionValueRows = await hydrateTranslations(db, 'product_option_value', rawOptionValueRows, ov => String(ov.id), [{fieldName: 'value', objectKey: 'value'}], [{fieldName: 'value', objectKey: 'value'}]);
    const optionValuesByOptionId = new Map<
      number,
      (typeof optionValueRows)[number][]
    >()
    const optionValueById = new Map<number, (typeof optionValueRows)[number]>()
    for (const ov of optionValueRows) {
      const current = optionValuesByOptionId.get(ov.optionId) ?? []
      current.push(ov)
      optionValuesByOptionId.set(ov.optionId, current)
      optionValueById.set(ov.id, ov)
    }

    const optionById = new Map(resolvedOptions.map((row) => [row.id, row]))
    const variantOptionIdsMap = new Map<number, number[]>()
    const variantMediaByVariantId = new Map<
      number,
      (typeof variantMediaRows)[number][]
    >()

    for (const vo of variantOptionRows) {
      const current = variantOptionIdsMap.get(vo.variantId) ?? []
      current.push(vo.optionValueId)
      variantOptionIdsMap.set(vo.variantId, current)
    }

    for (const vm of variantMediaRows) {
      const current = variantMediaByVariantId.get(vm.variantId) ?? []
      current.push(vm)
      variantMediaByVariantId.set(vm.variantId, current)
    }

    let customization: any = null;
    if (customizationRow && customizationRow.enabled) {
      const parsedCustomization = {
        enabled: true,
        canvasWidthPx: customizationRow.canvasWidthPx,
        canvasHeightPx: customizationRow.canvasHeightPx,
        layers: JSON.parse(customizationRow.layersJson),
        formFields: JSON.parse(customizationRow.formFieldsJson)
      };
      await hydrateCustomization(db, parsedCustomization);
      const clipartCategoryIds = Array.from(
        new Set(
          (parsedCustomization.layers as ProductCustomization["layers"]).flatMap((layer) => {
            if (layer.type !== "image_shape") return [];
            const clipartCategoryMode = layer.clipartCategoryMode ?? "fixed";
            if (clipartCategoryMode === "allow_list") {
              return (layer.allowedClipartCategories ?? []).map((category) => category.id);
            }
            return layer.clipartCategory ? [layer.clipartCategory.id] : [];
          }),
        ),
      );

      const [clipartCategoryRows, clipartAssetRows] = clipartCategoryIds.length
        ? await Promise.all([
            db
              .select({
                id: customizationClipartCategories.id,
                name: customizationClipartCategories.name,
              })
              .from(customizationClipartCategories)
              .where(
                and(
                  inArray(customizationClipartCategories.id, clipartCategoryIds),
                  eq(customizationClipartCategories.active, true),
                ),
              ),
            db
              .select({
                id: customizationClipartAssets.id,
                sourceAssetId: customizationClipartAssets.sourceAssetId,
                name: customizationClipartAssets.name,
                fileName: customizationClipartAssets.fileName,
                categoryId: customizationClipartAssets.categoryId,
                previewUrl: customizationClipartAssets.previewUrl,
                mimeType: customizationClipartAssets.mimeType,
                sourceWidthPx: customizationClipartAssets.sourceWidthPx,
                sourceHeightPx: customizationClipartAssets.sourceHeightPx,
                active: customizationClipartAssets.active,
              })
              .from(customizationClipartAssets)
              .where(
                and(
                  inArray(customizationClipartAssets.categoryId, clipartCategoryIds),
                  eq(customizationClipartAssets.active, true),
                ),
              ),
          ])
        : [[], []];

      const clipartCategoriesById = new Map(
        clipartCategoryRows.map((category) => [category.id, category] as const),
      );
      const clipartAssetsByCategoryId = new Map<string, Array<(typeof clipartAssetRows)[number]>>();
      for (const asset of clipartAssetRows) {
        const current = clipartAssetsByCategoryId.get(asset.categoryId) ?? [];
        current.push(asset);
        clipartAssetsByCategoryId.set(asset.categoryId, current);
      }

      customization = sanitizeShopperCustomizationWithClipart({
        productId: String(product.id),
        enabled: true,
        canvasWidthPx: parsedCustomization.canvasWidthPx,
        canvasHeightPx: parsedCustomization.canvasHeightPx,
        layers: parsedCustomization.layers as ProductCustomization["layers"],
        formFields: parsedCustomization.formFields as CustomizationFormField[],
      }, {
        clipartCategoriesById,
        clipartAssetsByCategoryId,
      });
    }

    const detail = {
      id: product.id,
      title: product.title,
      subtitle: product.subtitle,
      handle: product.handle,
      description: product.description,
      status: product.status,
      categories: resolvedCategories,
      attributes: resolvedAttributes,
      options: resolvedOptions.map((option) => ({
        ...option,
        values: optionValuesByOptionId.get(option.id) ?? []
      })),
      variants: variantRows.map((variant) => {
        const ovIds = (variantOptionIdsMap.get(variant.id) ?? []).sort(
          (a, b) => a - b
        )

        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          priceAmount: variant.priceAmount,
          isDefault: variant.isDefault,
          position: variant.position,
          media: (variantMediaByVariantId.get(variant.id) ?? []).map((m) => ({
            id: m.assetId,
            assetId: m.assetId,
            fileName: m.fileName,
            mimeType: m.mimeType,
            widthPx: m.widthPx,
            heightPx: m.heightPx,
            byteSize: m.byteSize,
            position: m.position,
            contentUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${m.assetId}/content`) as string
          })),
          optionValues: ovIds
            .map((ovId) => {
              const ov = optionValueById.get(ovId)

              if (!ov) {
                return null
              }

              const option = optionById.get(ov.optionId)

              return {
                id: ov.id,
                value: ov.value,
                optionId: ov.optionId,
                optionTitle: option?.title ?? null
              }
            })
            .filter(Boolean)
        }
      }),
      customization
    }

    return c.json({ item: detail }, 200)
  })

export type StorefrontListingItem = ReturnType<typeof buildListingItem>

export function buildListingItem(
  c: Context<AppEnv>,
  item: {
    id: number
    title: string
    subtitle: string | null
    handle: string
  },
  categories: string[],
  variants: Array<{ id: number; isDefault: boolean; priceAmount: number | null }>,
  variantMediaByVariantId: Map<number, Array<{ assetId: string }>>,
  customizationEnabled: boolean
) {
  const prices = variants
    .map((v) => v.priceAmount)
    .filter((p): p is number => p !== null)
  const uniquePrices = new Set(prices)
  const priceAmount = uniquePrices.size > 0 ? Math.min(...uniquePrices) : null
  const priceFrom = uniquePrices.size > 1

  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]

  let thumbnail: string | null = null
  if (defaultVariant) {
    const defaultMedia = variantMediaByVariantId.get(defaultVariant.id) ?? []
    if (defaultMedia.length > 0) {
      thumbnail = toAbsoluteAssetUrl(c, `/api/assets/products/${defaultMedia[0].assetId}/content`) as string
    }
  }
  if (!thumbnail) {
    for (const variant of variants) {
      const media = variantMediaByVariantId.get(variant.id) ?? []
      if (media.length > 0) {
        thumbnail = toAbsoluteAssetUrl(c, `/api/assets/products/${media[0].assetId}/content`) as string
        break
      }
    }
  }

  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    handle: item.handle,
    priceAmount,
    priceFrom,
    thumbnail,
    categorySummary: categories.join(', ') || null,
    customizable: customizationEnabled
  }
}
