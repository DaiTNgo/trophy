CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_amount` integer NOT NULL,
	`line_subtotal_amount` integer NOT NULL,
	`product_snapshot_json` text NOT NULL,
	`variant_snapshot_json` text NOT NULL,
	`background_snapshot_json` text,
	`customization_snapshot_json` text,
	`production_status` text DEFAULT 'not_required' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`payment_method` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_email` text,
	`primary_address_json` text NOT NULL,
	`shipping_address_json` text,
	`ship_to_different_address` integer DEFAULT false NOT NULL,
	`subtotal_amount` integer NOT NULL,
	`total_amount` integer NOT NULL,
	`currency_code` text DEFAULT 'VND' NOT NULL,
	`item_count` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `product_variants` ADD `inventory_quantity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `allow_backorder` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `product_categories` DROP COLUMN `parent_id`;