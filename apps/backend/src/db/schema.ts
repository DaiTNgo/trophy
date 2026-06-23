import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
});

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const accounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const samples = sqliteTable("samples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const productTypes = sqliteTable(
  "product_types",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    value: text("value").notNull(),
  },
  (table) => [uniqueIndex("product_types_value_idx").on(table.value)],
);

export const productCollections = sqliteTable(
  "product_collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
  },
  (table) => [uniqueIndex("product_collections_handle_idx").on(table.handle)],
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    parentId: integer("parent_id"),
  },
  (table) => [uniqueIndex("product_categories_handle_idx").on(table.handle)],
);

export const productTags = sqliteTable(
  "product_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    value: text("value").notNull(),
  },
  (table) => [uniqueIndex("product_tags_value_idx").on(table.value)],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    handle: text("handle").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    hasVariants: integer("has_variants", { mode: "boolean" }).notNull().default(false),
    typeId: integer("type_id"),
    collectionId: integer("collection_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("products_handle_idx").on(table.handle)],
);

export const productCategoryLinks = sqliteTable(
  "product_category_links",
  {
    productId: integer("product_id").notNull(),
    categoryId: integer("category_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })],
);

export const productTagLinks = sqliteTable(
  "product_tag_links",
  {
    productId: integer("product_id").notNull(),
    tagId: integer("tag_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })],
);

export const productOptions = sqliteTable("product_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull(),
});

export const productOptionValues = sqliteTable("product_option_values", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  optionId: integer("option_id").notNull(),
  value: text("value").notNull(),
  position: integer("position").notNull(),
});

export const productVariants = sqliteTable("product_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  title: text("title").notNull(),
  sku: text("sku"),
  priceAmount: integer("price_amount"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const productVariantOptionValues = sqliteTable(
  "product_variant_option_values",
  {
    variantId: integer("variant_id").notNull(),
    optionValueId: integer("option_value_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.optionValueId] })],
);

export const productAttributes = sqliteTable("product_attributes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  unit: text("unit"),
  position: integer("position").notNull(),
});

export const productMedia = sqliteTable("product_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  position: integer("position").notNull(),
});

export const productAssets = sqliteTable(
  "product_assets",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    byteSize: integer("byte_size").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("product_assets_owner_key_idx").on(table.ownerKey)],
);

export const customizationTemplates = sqliteTable(
  "customization_templates",
  {
    id: text("id").primaryKey(),
    productId: integer("product_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"),
    activeRevisionId: text("active_revision_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("customization_templates_product_idx").on(table.productId)],
);

export const customizationTemplateRevisions = sqliteTable(
  "customization_template_revisions",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id").notNull(),
    revision: integer("revision").notNull(),
    status: text("status").notNull().default("draft"),
    previewAssetKey: text("preview_asset_key"),
    previewUrl: text("preview_url").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("customization_template_revision_idx").on(table.templateId, table.revision),
  ],
);

export const customizationZones = sqliteTable(
  "customization_zones",
  {
    id: text("id").primaryKey(),
    templateRevisionId: text("template_revision_id").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    previewXRatio: real("preview_x_ratio").notNull(),
    previewYRatio: real("preview_y_ratio").notNull(),
    previewWidthRatio: real("preview_width_ratio").notNull(),
    previewHeightRatio: real("preview_height_ratio").notNull(),
    rotationDeg: real("rotation_deg").notNull().default(0),
    widthMm: real("width_mm").notNull(),
    heightMm: real("height_mm").notNull(),
    bleedMm: real("bleed_mm").notNull().default(0),
    safeMarginMm: real("safe_margin_mm").notNull().default(0),
    allowedContentJson: text("allowed_content_json").notNull(),
    textRulesJson: text("text_rules_json").notNull(),
    productionJson: text("production_json").notNull(),
    blocksJson: text("blocks_json").notNull().default("[]"),
  },
  (table) => [
    uniqueIndex("customization_zone_revision_name_idx").on(table.templateRevisionId, table.name),
  ],
);

export const customizationDesigns = sqliteTable("customization_designs", {
  id: text("id").primaryKey(),
  productId: integer("product_id").notNull(),
  templateRevisionId: text("template_revision_id").notNull(),
  currentRevision: integer("current_revision").notNull().default(1),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const customizationDesignRevisions = sqliteTable(
  "customization_design_revisions",
  {
    id: text("id").primaryKey(),
    designId: text("design_id").notNull(),
    revision: integer("revision").notNull(),
    status: text("status").notNull().default("draft"),
    documentJson: text("document_json").notNull(),
    validationJson: text("validation_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    frozenAt: text("frozen_at"),
  },
  (table) => [uniqueIndex("customization_design_revision_idx").on(table.designId, table.revision)],
);

export const customizationAssets = sqliteTable("customization_assets", {
  id: text("id").primaryKey(),
  ownerKey: text("owner_key").notNull(),
  objectKey: text("object_key").notNull(),
  previewObjectKey: text("preview_object_key"),
  mimeType: text("mime_type").notNull(),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  byteSize: integer("byte_size").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const customizationExports = sqliteTable(
  "customization_exports",
  {
    id: text("id").primaryKey(),
    designRevisionId: text("design_revision_id").notNull(),
    profileRevision: integer("profile_revision").notNull().default(1),
    format: text("format").notNull(),
    status: text("status").notNull().default("pending"),
    objectKey: text("object_key"),
    error: text("error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("customization_export_deterministic_idx").on(
      table.designRevisionId,
      table.profileRevision,
      table.format,
    ),
  ],
);
