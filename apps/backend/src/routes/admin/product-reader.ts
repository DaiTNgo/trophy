import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { type Context } from 'hono'
import { getDb } from '../../db/client'
import {
  productAssets,
  productAttributes,
  productCategories,
  productCategoryLinks,
  productCollections,
  productCustomizations,
  productMedia,
  productOptionValues,
  productOptions,
  productVariantAttributes,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import { hydrateTranslations } from '../../lib/catalog-translation'
import { hydrateCustomization } from '../../lib/customization-translation'
import type { AppEnv } from '../../lib/env'
import { makeCustomizationUrlsAbsolute, toAbsoluteAssetUrl } from '../../lib/url'

export async function readProduct(
  c: Context<AppEnv>,
  db: ReturnType<typeof getDb>,
  productId: number,
  { includeTrashed = false }: { includeTrashed?: boolean } = {}
) {
  const product = await db
    .select()
    .from(products)
    .where(
      includeTrashed
        ? eq(products.id, productId)
        : and(eq(products.id, productId), isNull(products.deletedAt))
    )
    .get()

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
    variantAttributeRows,
    variantMediaRows,
    variantCustomizationMediaRows,
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
      .innerJoin(productCategories, eq(productCategoryLinks.categoryId, productCategories.id))
      .where(eq(productCategoryLinks.productId, productId)),
    db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId))
      .orderBy(asc(productAttributes.position), asc(productAttributes.id)),
    db
      .select({
        id: productMedia.id,
        assetId: productMedia.assetId,
        position: productMedia.position,
        fileName: productAssets.fileName,
        ownerKey: productAssets.ownerKey,
        mimeType: productAssets.mimeType,
        widthPx: productAssets.widthPx,
        heightPx: productAssets.heightPx,
        byteSize: productAssets.byteSize
      })
      .from(productMedia)
      .innerJoin(productAssets, eq(productMedia.assetId, productAssets.id))
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
        id: productVariantAttributes.id,
        variantId: productVariantAttributes.variantId,
        name: productVariantAttributes.name,
        value: productVariantAttributes.value,
        unit: productVariantAttributes.unit,
        position: productVariantAttributes.position
      })
      .from(productVariantAttributes)
      .where(
        sql`${productVariantAttributes.variantId} in (
          select ${productVariants.id}
          from ${productVariants}
          where ${productVariants.productId} = ${productId}
        )`
      )
      .orderBy(
        asc(productVariantAttributes.variantId),
        asc(productVariantAttributes.position),
        asc(productVariantAttributes.id)
      ),
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
      .select({
        variantId: productVariantCustomizationMedia.variantId,
        assetId: productVariantCustomizationMedia.assetId,
        fileName: productAssets.fileName,
        mimeType: productAssets.mimeType,
        widthPx: productAssets.widthPx,
        heightPx: productAssets.heightPx,
        byteSize: productAssets.byteSize
      })
      .from(productVariantCustomizationMedia)
      .innerJoin(productAssets, eq(productVariantCustomizationMedia.assetId, productAssets.id))
      .where(
        sql`${productVariantCustomizationMedia.variantId} in (
          select ${productVariants.id}
          from ${productVariants}
          where ${productVariants.productId} = ${productId}
        )`
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
      (attribute) => String(attribute.id),
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
      (option) => String(option.id),
      [{ fieldName: 'title', objectKey: 'title' }],
      [{ fieldName: 'title', objectKey: 'title' }]
    )
  }

  if (optionValueRows.length > 0) {
    await hydrateTranslations(
      db,
      'product_option_value',
      optionValueRows,
      (optionValue) => String(optionValue.id),
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

  const hydratedVariantAttributeRows =
    variantAttributeRows.length > 0
      ? await hydrateTranslations(
          db,
          'product_variant_attribute',
          variantAttributeRows,
          (attribute) => String(attribute.id),
          [
            { fieldName: 'name', objectKey: 'name' },
            { fieldName: 'value', objectKey: 'value' }
          ],
          [
            { fieldName: 'name', objectKey: 'name' },
            { fieldName: 'value', objectKey: 'value' }
          ]
        )
      : variantAttributeRows

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
  const variantAttributesByVariantId = new Map<number, typeof hydratedVariantAttributeRows>()
  const variantMediaByVariantId = new Map<number, typeof variantMediaRows>()
  const variantCustomizationMediaByVariantId = new Map<
    number,
    (typeof variantCustomizationMediaRows)[number]
  >()
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

  for (const customizationMedia of variantCustomizationMediaRows) {
    variantCustomizationMediaByVariantId.set(customizationMedia.variantId, customizationMedia)
  }

  for (const variantAttribute of hydratedVariantAttributeRows) {
    const current = variantAttributesByVariantId.get(variantAttribute.variantId) ?? []
    current.push(variantAttribute)
    variantAttributesByVariantId.set(variantAttribute.variantId, current)
  }

  const customization = customizationRow
    ? makeCustomizationUrlsAbsolute(c, {
        ...(() => {
          const stored = {
            canvasWidthPx: customizationRow.canvasWidthPx,
            canvasHeightPx: customizationRow.canvasHeightPx,
            layers: JSON.parse(customizationRow.layersJson),
            formFields: JSON.parse(customizationRow.formFieldsJson)
          }
          return {
            ...stored,
            layerCount: stored.layers.length,
            formFieldCount: stored.formFields.length
          }
        })(),
        enabled: customizationRow.enabled,
        createdAt: customizationRow.createdAt,
        updatedAt: customizationRow.updatedAt
      })
    : null

  if (customization) {
    await hydrateCustomization(db, customization)
  }

  const baseProduct = {
    ...product,
    collection,
    categories: categoryRows,
    attributes: attributeRows,
    media: mediaRows.map((media) => ({
      ...media,
      isProductOwned: media.ownerKey === `catalog:${productId}:media`,
      contentUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${media.assetId}/content`) as string
    })),
    options: optionRows.map((option) => ({
      ...option,
      values: optionValuesByOptionId.get(option.id) ?? []
    })),
    customization,
    variants: hydratedVariantRows.map((variant) => {
      const optionValueIds = (variantOptionIds.get(variant.id) ?? []).sort((a, b) => a - b)

      return {
        ...variant,
        attributes: variantAttributesByVariantId.get(variant.id) ?? [],
        media: (variantMediaByVariantId.get(variant.id) ?? []).map((media) => ({
          id: media.assetId,
          fileName: media.fileName,
          mimeType: media.mimeType,
          widthPx: media.widthPx,
          heightPx: media.heightPx,
          byteSize: media.byteSize,
          position: media.position,
          contentUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${media.assetId}/content`) as string,
          previewUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${media.assetId}/preview`) as string,
        })),
        customizationMedia: (() => {
          const media = variantCustomizationMediaByVariantId.get(variant.id)
          return media
            ? {
                id: media.assetId,
                fileName: media.fileName,
                mimeType: media.mimeType,
                widthPx: media.widthPx,
                heightPx: media.heightPx,
                byteSize: media.byteSize,
                contentUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${media.assetId}/content`) as string,
                previewUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${media.assetId}/preview`) as string,
              }
            : null
        })(),
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
    (currentProduct) => String(currentProduct.id),
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
