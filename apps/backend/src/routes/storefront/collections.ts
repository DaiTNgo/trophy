import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Hono, type Context } from "hono";
import { toAbsoluteAssetUrl } from "../../lib/url";
import * as v from "valibot";
import { getDb } from "../../db/client";
import {
  productCategories,
  productCategoryLinks,
  productCollections,
  productCollectionLinks,
  productCustomizations,
  productMedia,
  orderItems,
  productVariantMedia,
  productVariantCustomizationMedia,
  productVariants,
  products,
} from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { parseParams } from "../../lib/validation";
import { hydrateTranslations } from "../../lib/catalog-translation";
import { localeSchema, DEFAULT_LOCALE } from "../../lib/locale";
import { buildListingItem } from "./products";

const querySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
  customizable: v.optional(v.picklist(["all", "true", "false"]), "all"),
  category: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(255),
      v.transform((value) => (value.length === 0 ? undefined : value))
    )
  ),
});

const handleParamsSchema = v.object({
  handle: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
});

export type CustomizableFilter = "all" | "true" | "false";

export function buildCustomizableCondition(filter: CustomizableFilter) {
  if (filter === "true") {
    return sql`exists (
      select 1
      from ${productCustomizations}
      where ${productCustomizations.productId} = ${products.id}
        and ${productCustomizations.enabled} = true
    )`;
  }

  if (filter === "false") {
    return sql`not exists (
      select 1
      from ${productCustomizations}
      where ${productCustomizations.productId} = ${products.id}
        and ${productCustomizations.enabled} = true
    )`;
  }

  return undefined;
}

export async function loadListingPage(
  c: Context<AppEnv>,
  db: ReturnType<typeof getDb>,
  whereClause: SQL | undefined,
  limit: number,
  offset: number,
) {
  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        subtitle: products.subtitle,
        handle: products.handle,
        status: products.status,
        thumbnailAssetId: products.thumbnailAssetId,
        hoverAssetId: products.hoverAssetId,
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
      .get(),
  ]);

  const productIds = items.map((item) => item.id);

  const [
    categoryRows,
    productMediaRows,
    variantRows,
    variantMediaRows,
    variantCustomizationMediaRows,
    customizationRows,
  ] = await Promise.all([
    productIds.length > 0
      ? db
          .select({
            productId: productCategoryLinks.productId,
            categoryId: productCategories.id,
            name: productCategories.name,
          })
          .from(productCategoryLinks)
          .innerJoin(
            productCategories,
            eq(productCategoryLinks.categoryId, productCategories.id),
          )
          .where(
            and(
              inArray(productCategoryLinks.productId, productIds),
              eq(productCategories.visibility, "public"),
            ),
          )
      : Promise.resolve(
          [] as Array<{ productId: number; categoryId: number; name: string }>,
        ),
    productIds.length > 0
      ? db
          .select({
            productId: productMedia.productId,
            assetId: productMedia.assetId,
            position: productMedia.position,
          })
          .from(productMedia)
          .where(inArray(productMedia.productId, productIds))
          .orderBy(
            asc(productMedia.productId),
            asc(productMedia.position),
            asc(productMedia.id),
          )
      : Promise.resolve(
          [] as Array<{ productId: number; assetId: string; position: number }>,
        ),
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
            productId: productVariants.productId,
          })
          .from(productVariantMedia)
          .innerJoin(
            productVariants,
            eq(productVariantMedia.variantId, productVariants.id),
          )
          .where(inArray(productVariants.productId, productIds))
          .orderBy(
            asc(productVariantMedia.variantId),
            asc(productVariantMedia.position),
            asc(productVariantMedia.assetId),
          )
      : Promise.resolve(
          [] as Array<{
            variantId: number;
            assetId: string;
            position: number;
            productId: number;
          }>,
        ),
    productIds.length > 0
      ? db
          .select({
            variantId: productVariantCustomizationMedia.variantId,
            assetId: productVariantCustomizationMedia.assetId,
            productId: productVariants.productId,
          })
          .from(productVariantCustomizationMedia)
          .innerJoin(
            productVariants,
            eq(productVariantCustomizationMedia.variantId, productVariants.id),
          )
          .where(inArray(productVariants.productId, productIds))
      : Promise.resolve(
          [] as Array<{
            variantId: number;
            assetId: string;
            productId: number;
          }>,
        ),
    productIds.length > 0
      ? db
          .select({
            productId: productCustomizations.productId,
            enabled: productCustomizations.enabled,
          })
          .from(productCustomizations)
          .where(inArray(productCustomizations.productId, productIds))
      : Promise.resolve([] as Array<{ productId: number; enabled: boolean }>),
  ]);

  const resolvedItems = await hydrateTranslations(
    db,
    "product",
    items,
    (i) => String(i.id),
    [
      { fieldName: "title", objectKey: "title" },
      { fieldName: "subtitle", objectKey: "subtitle" },
    ],
    [
      { fieldName: "title", objectKey: "title" },
      { fieldName: "subtitle", objectKey: "subtitle" },
    ],
  );
  const resolvedCategories = await hydrateTranslations(
    db,
    "product_category",
    categoryRows,
    (c) => String(c.categoryId),
    [{ fieldName: "name", objectKey: "name" }],
    [{ fieldName: "name", objectKey: "name" }],
  );

  const categoriesByProductId = new Map<number, string[]>();
  for (const row of resolvedCategories) {
    const current = categoriesByProductId.get(row.productId) ?? [];
    current.push(row.name);
    categoriesByProductId.set(row.productId, current);
  }

  const variantsByProductId = new Map<number, (typeof variantRows)[number][]>();
  for (const row of variantRows) {
    const current = variantsByProductId.get(row.productId) ?? [];
    current.push(row);
    variantsByProductId.set(row.productId, current);
  }

  const productMediaByProductId = new Map<
    number,
    Array<{ assetId: string; position: number }>
  >();
  for (const row of productMediaRows) {
    const current = productMediaByProductId.get(row.productId) ?? [];
    current.push(row);
    productMediaByProductId.set(row.productId, current);
  }

  const variantMediaByVariantId = new Map<
    number,
    (typeof variantMediaRows)[number][]
  >();
  for (const row of variantMediaRows) {
    const current = variantMediaByVariantId.get(row.variantId) ?? [];
    current.push(row);
    variantMediaByVariantId.set(row.variantId, current);
  }

  const variantCustomizationMediaByVariantId = new Map<
    number,
    { assetId: string }
  >();
  for (const row of variantCustomizationMediaRows) {
    variantCustomizationMediaByVariantId.set(row.variantId, row);
  }

  const customizationByProductId = new Map(
    customizationRows.map((row) => [row.productId, row]),
  );

  const listingItems = resolvedItems.map((item) =>
    buildListingItem(
      c,
      item,
      categoriesByProductId.get(item.id) ?? [],
      variantsByProductId.get(item.id) ?? [],
      variantMediaByVariantId,
      customizationByProductId.get(item.id)?.enabled ?? false,
      variantCustomizationMediaByVariantId,
      item.thumbnailAssetId ?? null,
      item.hoverAssetId ?? null,
    ),
  );

  return {
    items: listingItems,
    total: totalResult?.total ?? 0,
  };
}

async function loadBestSellersPage(
  c: Context<AppEnv>,
  db: ReturnType<typeof getDb>,
  collection: { id: number } | undefined,
  customizable: CustomizableFilter,
  categoryHandle: string | undefined,
  limit: number,
  offset: number,
) {
  const conditions = [eq(products.status, "published"), isNull(products.deletedAt)];
  const customizableCondition = buildCustomizableCondition(customizable);
  if (customizableCondition) {
    conditions.push(customizableCondition);
  }
  if (categoryHandle) {
    conditions.push(
      sql`exists (
        select 1
        from ${productCategoryLinks}
        inner join ${productCategories}
          on ${productCategories.id} = ${productCategoryLinks.categoryId}
        where ${productCategoryLinks.productId} = ${products.id}
          and ${productCategories.handle} = ${categoryHandle}
          and ${productCategories.visibility} = 'public'
      )`
    );
  }
  const whereClause = and(...conditions);
  const salesQuantity = sql<number>`coalesce((
    select sum(${orderItems.quantity})
    from ${orderItems}
    where ${orderItems.productId} = ${products.id}
  ), 0)`;
  const sourceTier = collection
    ? sql<number>`case
      when exists (select 1 from ${productCollectionLinks} where ${productCollectionLinks.productId} = ${products.id} and ${productCollectionLinks.collectionId} = ${collection.id}) then 0
      when ${salesQuantity} > 0 then 1
      else 2
    end`
    : sql<number>`case when ${salesQuantity} > 0 then 1 else 2 end`;
  const salesPriority = sql<number>`case when ${sourceTier} = 1 then ${salesQuantity} else 0 end`;

  const rankedRows = await db
    .select({ id: products.id })
    .from(products)
    .where(whereClause)
    .orderBy(asc(sourceTier), desc(salesPriority), desc(products.id))
    .limit(limit)
    .offset(offset);
  const totalResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .get();
  const productIds = rankedRows.map((row) => row.id);

  if (productIds.length === 0) {
    return { items: [], total: totalResult?.total ?? 0 };
  }

  const details = await loadListingPage(
    c,
    db,
    inArray(products.id, productIds),
    productIds.length,
    0,
  );
  const itemsByProductId = new Map(
    details.items.map((item) => [item.id, item]),
  );

  return {
    items: productIds.flatMap((id) => {
      const item = itemsByProductId.get(id);
      return item ? [item] : [];
    }),
    total: totalResult?.total ?? 0,
  };
}

export const storefrontCollectionsRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    const parsedQuery = v.safeParse(querySchema, c.req.query());
    if (!parsedQuery.success) {
      return c.json({ error: "Validation failed" }, 400);
    }
    const items = await db
      .select({
        id: productCollections.id,
        title: productCollections.title,
        handle: productCollections.handle,
        imageUrl: productCollections.imageUrl,
        visibility: productCollections.visibility,
      })
      .from(productCollections)
      .where(
        or(
          eq(productCollections.visibility, "public"),
          isNull(productCollections.visibility),
        ),
      )
      .orderBy(asc(productCollections.position));

    const resolvedItems = await hydrateTranslations(
      db,
      "product_collection",
      items,
      (i) => String(i.id),
      [{ fieldName: "title", objectKey: "title" }],
      [{ fieldName: "title", objectKey: "title" }],
    );
    return c.json(
      {
        items: resolvedItems.map((item) => ({
          ...item,
          visibility: item.visibility ?? "public",
          imageUrl: item.imageUrl
            ? (toAbsoluteAssetUrl(c, item.imageUrl) as string)
            : null,
        })),
      },
      200,
    );
  })
  .get("/:handle/products", async (c) => {
    const parsed = parseParams(c, handleParamsSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb(c.env);
    const parsedQuery = v.safeParse(querySchema, c.req.query());
    if (!parsedQuery.success) {
      return c.json({ error: "Validation failed" }, 400);
    }
    const customizable = parsedQuery.output.customizable;
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(c.req.query("limit")) || 20),
    );
    const offset = (page - 1) * limit;

    const collection = await db
      .select({
        id: productCollections.id,
        visibility: productCollections.visibility,
      })
      .from(productCollections)
      .where(
        and(
          eq(productCollections.handle, parsed.output.handle),
          or(
            eq(productCollections.visibility, "public"),
            isNull(productCollections.visibility),
          ),
        ),
      )
      .get();

    if (parsed.output.handle === "best-sellers") {
      const listing = await loadBestSellersPage(
        c,
        db,
        collection,
        customizable,
        parsedQuery.output.category,
        limit,
        offset,
      );
      return c.json(
        {
          items: listing.items,
          page,
          limit,
          total: listing.total,
          availableCategories: [],
        },
        200,
      );
    }

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    const availableCategoryRows = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        handle: productCategories.handle,
        position: productCategories.position,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.visibility, "public"),
          sql`exists (
            select 1
            from ${productCategoryLinks}
            inner join ${products}
              on ${products.id} = ${productCategoryLinks.productId}
            inner join ${productCollectionLinks}
              on ${productCollectionLinks.productId} = ${products.id}
            where ${productCategoryLinks.categoryId} = ${productCategories.id}
              and ${productCollectionLinks.collectionId} = ${collection.id}
              and ${products.status} = 'published'
              and ${products.deletedAt} is null
          )`
        )
      )
      .orderBy(asc(productCategories.position), asc(productCategories.id));

    const hydratedCategories = await hydrateTranslations(
      db,
      "product_category",
      availableCategoryRows,
      (item) => String(item.id),
      [{ fieldName: "name", objectKey: "name" }],
      [{ fieldName: "name", objectKey: "name" }],
    );

    const availableCategories = hydratedCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      handle: cat.handle,
    }));

    const conditions = [
      eq(products.status, "published"),
      isNull(products.deletedAt),
      sql`exists (
        select 1
        from ${productCollectionLinks}
        where ${productCollectionLinks.productId} = ${products.id}
          and ${productCollectionLinks.collectionId} = ${collection.id}
      )`,
    ];
    if (parsedQuery.output.category) {
      conditions.push(
        sql`exists (
          select 1
          from ${productCategoryLinks}
          inner join ${productCategories}
            on ${productCategories.id} = ${productCategoryLinks.categoryId}
          where ${productCategoryLinks.productId} = ${products.id}
            and ${productCategories.handle} = ${parsedQuery.output.category}
            and ${productCategories.visibility} = 'public'
        )`
      );
    }
    const customizableCondition = buildCustomizableCondition(customizable);
    if (customizableCondition) {
      conditions.push(customizableCondition);
    }
    const whereClause = and(...conditions);

    const primary = await loadListingPage(c, db, whereClause, limit, offset);
    let listingItems = primary.items;
    let total = primary.total;

    return c.json(
      {
        items: listingItems,
        page,
        limit,
        total,
        availableCategories,
      },
      200,
    );
  });
