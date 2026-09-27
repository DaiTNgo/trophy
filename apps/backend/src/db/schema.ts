import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const brandColors = pgTable("brand_color", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hexCode: text("hex_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const fontFamilies = pgTable("font_family", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  regularAssetId: text("regular_asset_id"),
  boldAssetId: text("bold_asset_id"),
  italicAssetId: text("italic_asset_id"),
  boldItalicAssetId: text("bold_italic_asset_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true, mode: "date" }),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
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

export const accounts = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const samples = pgTable("samples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const productCollections = pgTable(
  "product_collections",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    handle: text("handle").notNull(),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    visibility: text("visibility").notNull().default("public"),
  },
  (table) => [uniqueIndex("product_collections_handle_idx").on(table.handle)],
);

export const productCategories = pgTable(
  "product_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    visibility: text("visibility").notNull().default("public"),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("product_categories_handle_idx").on(table.handle)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    handle: text("handle").notNull(),
    description: text("description"),
    whyThisProductHtml: text("why_this_product_html"),
    specificationsHtml: text("specifications_html"),
    shippingHtml: text("shipping_html"),
    status: text("status").notNull().default("draft"),
    thumbnailAssetId: text("thumbnail_asset_id"),
    hoverAssetId: text("hover_asset_id"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    customizationOperationToken: text("customization_operation_token"),
    customizationOperationExpiresAt: text("customization_operation_expires_at"),
    deletedAt: text("deleted_at"),
  },
  (table) => [uniqueIndex("products_handle_idx").on(table.handle)],
);

export const productCollectionLinks = pgTable(
  "product_collection_links",
  {
    productId: integer("product_id").notNull(),
    collectionId: integer("collection_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.collectionId] })],
);

export const productCategoryLinks = pgTable(
  "product_category_links",
  {
    productId: integer("product_id").notNull(),
    categoryId: integer("category_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })],
);

export const productOptions = pgTable("product_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  title: text("title").notNull(),
  displayType: text("display_type").notNull().default("text"),
  position: integer("position").notNull(),
});

export const productOptionValues = pgTable("product_option_values", {
  id: serial("id").primaryKey(),
  optionId: integer("option_id").notNull(),
  value: text("value").notNull(),
  colorHex: text("color_hex"),
  swatchAssetId: text("swatch_asset_id"),
  position: integer("position").notNull(),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    writeToken: text("write_token"),
    productId: integer("product_id").notNull(),
    title: text("title").notNull(),
    sku: text("sku"),
    misaProductId: integer("misa_product_id"),
    misaProductCode: text("misa_product_code"),
    misaSyncStatus: text("misa_sync_status").notNull().default("pending"),
    misaLastError: text("misa_last_error"),
    misaSyncedAt: timestamp("misa_synced_at", { withTimezone: true, mode: "date" }),
    priceAmount: integer("price_amount"),
    inventoryQuantity: integer("inventory_quantity").notNull().default(0),
    allowBackorder: boolean("allow_backorder")
      .notNull()
      .default(false),
    isDefault: boolean("is_default")
      .notNull()
      .default(false),
    position: integer("position").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("product_variants_write_token_idx").on(table.writeToken)],
);

export const productVariantMedia = pgTable(
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
    uniqueIndex("product_variant_media_variant_position_idx").on(
      table.variantId,
      table.position,
    ),
  ],
);

export const productVariantCustomizationMedia = pgTable(
  "product_variant_customization_media",
  {
    variantId: integer("variant_id").notNull(),
    assetId: text("asset_id").notNull().unique(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.variantId] })],
);

export const productCustomizations = pgTable(
  "product_customizations",
  {
    productId: integer("product_id").notNull(),
    enabled: boolean("enabled").notNull().default(false),
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

export const productVariantOptionValues = pgTable(
  "product_variant_option_values",
  {
    variantId: integer("variant_id").notNull(),
    optionValueId: integer("option_value_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.optionValueId] })],
);

export const productVariantAttributes = pgTable(
  "product_variant_attributes",
  {
    id: serial("id").primaryKey(),
    writeToken: text("write_token"),
    variantId: integer("variant_id").notNull(),
    name: text("name").notNull(),
    value: text("value").notNull(),
    unit: text("unit"),
    position: integer("position").notNull(),
  },
  (table) => [uniqueIndex("product_variant_attributes_write_token_idx").on(table.writeToken)],
);

export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  unit: text("unit"),
  position: integer("position").notNull(),
});

export const productMedia = pgTable("product_media", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  assetId: text("asset_id").notNull(),
  position: integer("position").notNull(),
}, (table) => [
  uniqueIndex("product_media_product_asset_idx").on(table.productId, table.assetId),
]);

export const productAssets = pgTable(
  "product_assets",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    objectKey: text("object_key").notNull(),
    previewObjectKey: text("preview_object_key"),
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

export const r2CleanupJobs = pgTable(
  "r2_cleanup_jobs",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: text("next_attempt_at").notNull(),
    lastError: text("last_error"),
    completedAt: text("completed_at"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: text("lease_expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("r2_cleanup_jobs_pending_idx").on(table.completedAt, table.nextAttemptAt),
    uniqueIndex("r2_cleanup_jobs_object_key_idx").on(table.objectKey),
  ],
);

export const misaDeletionJobs = pgTable(
  "misa_deletion_jobs",
  {
    id: text("id").primaryKey(),
    misaProductId: integer("misa_product_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: text("next_attempt_at").notNull(),
    lastError: text("last_error"),
    completedAt: text("completed_at"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: text("lease_expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("misa_deletion_jobs_pending_idx").on(table.completedAt, table.nextAttemptAt),
    uniqueIndex("misa_deletion_jobs_product_id_idx").on(table.misaProductId),
  ],
);

export const customizationTemplates = pgTable(
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
  (table) => [
    uniqueIndex("customization_templates_product_idx").on(table.productId),
  ],
);

export const customizationTemplateRevisions = pgTable(
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
    uniqueIndex("customization_template_revision_idx").on(
      table.templateId,
      table.revision,
    ),
  ],
);

export const customizationDesigns = pgTable("customization_designs", {
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

export const customizationDesignRevisions = pgTable(
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
  (table) => [
    uniqueIndex("customization_design_revision_idx").on(
      table.designId,
      table.revision,
    ),
  ],
);

export const customizationAssets = pgTable(
  "customization_assets",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    // Null on legacy rows. New shopper uploads use `shopper_draft` and expiry.
    ownershipType: text("ownership_type"),
    shopperDraftId: text("shopper_draft_id"),
    shopperFieldId: text("shopper_field_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    expiryProtected: boolean("expiry_protected")
      .notNull()
      .default(false),
    cleanupLastError: text("cleanup_last_error"),
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
  },
  (table) => [
    index("customization_assets_expiry_idx").on(
      table.ownershipType,
      table.expiresAt,
      table.expiryProtected,
    ),
  ],
);

export const customizationClipartCategories = pgTable(
  "customization_clipart_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

export const customizationClipartAssets = pgTable(
  "customization_clipart_assets",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").notNull(),
    sourceAssetId: text("source_asset_id").notNull(),
    name: text("name").notNull(),
    fileName: text("file_name"),
    previewUrl: text("preview_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sourceWidthPx: integer("source_width_px"),
    sourceHeightPx: integer("source_height_px"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

// ─── Orders ────────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  // statuses: narrow string unions enforced at application layer
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  fulfillmentStatus: text("fulfillment_status")
    .notNull()
    .default("unfulfilled"), // 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'
  paymentMethod: text("payment_method").notNull(), // 'bank_transfer' | 'cash_on_delivery'
  // customer details
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  // shopper-entered order note and optional VAT invoice details
  notes: text("notes"),
  vatDetailsJson: text("vat_details_json"),
  // primary address snapshot (JSON)
  primaryAddressJson: text("primary_address_json").notNull(),
  // optional different shipping address snapshot (JSON)
  shippingAddressJson: text("shipping_address_json"),
  shipToDifferentAddress: boolean("ship_to_different_address")
    .notNull()
    .default(false),
  // order totals (stored in smallest currency unit, e.g. VND đồng)
  subtotalAmount: integer("subtotal_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currencyCode: text("currency_code").notNull().default("VND"),
  itemCount: integer("item_count").notNull(),
  misaSyncStatus: text("misa_sync_status").notNull().default("pending"),
  misaSaleOrderId: text("misa_sale_order_id"),
  misaSaleOrderNo: text("misa_sale_order_no"),
  misaLastError: text("misa_last_error"),
  misaAttemptCount: integer("misa_attempt_count").notNull().default(0),
  misaSyncedAt: timestamp("misa_synced_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
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
  // production status: 'not_required' for plain items, 'pending_review' for customized, 'ready' after operator review
  productionStatus: text("production_status").notNull().default("not_required"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const orderItemMediaTransfers = pgTable(
  "order_item_media_transfers",
  {
    id: text("id").primaryKey(),
    orderItemId: integer("order_item_id").notNull(),
    status: text("status").notNull().default("pending"),
    lastError: text("last_error"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("order_item_media_transfers_item_idx").on(table.orderItemId)],
);

export const orderItemMediaTransferAssets = pgTable(
  "order_item_media_transfer_assets",
  {
    id: text("id").primaryKey(),
    transferId: text("transfer_id").notNull(),
    role: text("role").notNull(),
    fieldId: text("field_id"),
    sourceAssetId: text("source_asset_id").notNull(),
    sourceObjectKey: text("source_object_key").notNull(),
    targetObjectKey: text("target_object_key").notNull(),
    sourcePreviewObjectKey: text("source_preview_object_key"),
    targetPreviewObjectKey: text("target_preview_object_key"),
    status: text("status").notNull().default("pending"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("order_item_media_transfer_assets_transfer_idx").on(table.transferId),
    uniqueIndex("order_item_media_transfer_assets_target_idx").on(table.targetObjectKey),
  ],
);

// ─── Customization Exports ─────────────────────────────────────────────────────

export const customizationExports = pgTable(
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

export const catalogTranslations = pgTable(
  "catalog_translations",
  {
    id: serial("id").primaryKey(),
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

// ─── News / Articles ───────────────────────────────────────────────────────────

export const articleCategories = pgTable(
  "article_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("article_categories_slug_idx").on(table.slug)],
);

export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    contentHtml: text("content_html").notNull().default(""),
    contentJson: text("content_json"),
    featuredImageUrl: text("featured_image_url"),
    featuredImageAlt: text("featured_image_alt"),
    /** 'draft' | 'published' | 'scheduled' */
    status: text("status").notNull().default("draft"),
    /** Admin-pinned: shown first on the storefront listing with a badge */
    featured: boolean("featured").notNull().default(false),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("articles_slug_idx").on(table.slug),
    index("articles_status_published_at_idx").on(table.status, table.publishedAt),
    index("articles_author_id_idx").on(table.authorId),
  ],
);

export const articleCategoryLinks = pgTable(
  "article_category_links",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => articleCategories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.categoryId] }),
  ],
);

export const articleProductLinks = pgTable(
  "article_product_links",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.productId] }),
    index("article_product_links_article_id_idx").on(table.articleId),
  ],
);
