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

export const brandColors = sqliteTable("brand_color", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hexCode: text("hex_code").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const fontFamilies = sqliteTable("font_family", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  regularAssetId: text("regular_asset_id"),
  boldAssetId: text("bold_asset_id"),
  italicAssetId: text("italic_asset_id"),
  boldItalicAssetId: text("bold_italic_asset_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

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

export const productCollections = sqliteTable(
  "product_collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("product_collections_handle_idx").on(table.handle)],
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("product_categories_handle_idx").on(table.handle)],
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
  inventoryQuantity: integer("inventory_quantity").notNull().default(0),
  allowBackorder: integer("allow_backorder", { mode: "boolean" }).notNull().default(false),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const productVariantMedia = sqliteTable(
  "product_variant_media",
  {
    variantId: integer("variant_id").notNull(),
    assetId: text("asset_id").notNull(),
    position: integer("position").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.assetId] }),
    uniqueIndex("product_variant_media_variant_position_idx").on(table.variantId, table.position),
  ],
);

export const productCustomizations = sqliteTable(
  "product_customizations",
  {
    productId: integer("product_id").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    canvasWidthPx: integer("canvas_width_px"),
    canvasHeightPx: integer("canvas_height_px"),
    layersJson: text("layers_json").notNull().default("[]"),
    formFieldsJson: text("form_fields_json").notNull().default("[]"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.productId] }),
    uniqueIndex("product_customizations_product_idx").on(table.productId),
  ],
);

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
    previewWidthPx: integer("preview_width_px").notNull().default(0),
    previewHeightPx: integer("preview_height_px").notNull().default(0),
    blocksJson: text("blocks_json").notNull().default("[]"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("customization_template_revision_idx").on(table.templateId, table.revision),
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
  pageCount: integer("page_count"),
  widthPt: real("width_pt"),
  heightPt: real("height_pt"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const customizationIconAssets = sqliteTable("customization_icon_assets", {
  id: text("id").primaryKey(),
  sourceAssetId: text("source_asset_id").notNull(),
  name: text("name").notNull(),
  categoryId: text("category_id"),
  categoryLabel: text("category_label"),
  tagsJson: text("tags_json").notNull().default("[]"),
  previewUrl: text("preview_url").notNull(),
  mimeType: text("mime_type").notNull(),
  sourceWidthPx: integer("source_width_px"),
  sourceHeightPx: integer("source_height_px"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// ─── Orders ────────────────────────────────────────────────────────────────────

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull(),
  // statuses: narrow string unions enforced at application layer
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending' | 'paid' | 'failed' | 'refunded'
  fulfillmentStatus: text("fulfillment_status").notNull().default("unfulfilled"), // 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'
  paymentMethod: text("payment_method").notNull(), // 'bank_transfer' | 'cash_on_delivery'
  // customer details
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  // primary address snapshot (JSON)
  primaryAddressJson: text("primary_address_json").notNull(),
  // optional different shipping address snapshot (JSON)
  shippingAddressJson: text("shipping_address_json"),
  shipToDifferentAddress: integer("ship_to_different_address", { mode: "boolean" }).notNull().default(false),
  // order totals (stored in smallest currency unit, e.g. VND đồng)
  subtotalAmount: integer("subtotal_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currencyCode: text("currency_code").notNull().default("VND"),
  itemCount: integer("item_count").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  // shopper selection
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id").notNull(),
  quantity: integer("quantity").notNull(),
  // price snapshot
  unitPriceAmount: integer("unit_price_amount").notNull(),
  lineSubtotalAmount: integer("line_subtotal_amount").notNull(),
  // product snapshot (JSON)
  productSnapshotJson: text("product_snapshot_json").notNull(),
  // variant snapshot (JSON)
  variantSnapshotJson: text("variant_snapshot_json").notNull(),
  // selected variant background snapshot (JSON, nullable)
  backgroundSnapshotJson: text("background_snapshot_json"),
  // customization snapshot (JSON, nullable for non-customizable products)
  customizationSnapshotJson: text("customization_snapshot_json"),
  // production status: 'not_required' for plain items, 'pending_review' for customized
  productionStatus: text("production_status").notNull().default("not_required"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Customization Exports ─────────────────────────────────────────────────────

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

// ─── Translations ──────────────────────────────────────────────────────────────

export const catalogTranslations = sqliteTable(
  "catalog_translations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerType: text("owner_type").notNull(),
    ownerKey: text("owner_key").notNull(),
    fieldName: text("field_name").notNull(),
    locale: text("locale").notNull(),
    value: text("value").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("catalog_translations_unique_idx").on(
      table.ownerType,
      table.ownerKey,
      table.fieldName,
      table.locale,
    ),
  ],
);
