CREATE TABLE `product_attributes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`unit` text,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`parent_id` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_handle_idx` ON `product_categories` (`handle`);--> statement-breakpoint
CREATE TABLE `product_category_links` (
	`product_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`)
);
--> statement-breakpoint
CREATE TABLE `product_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`handle` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_collections_handle_idx` ON `product_collections` (`handle`);--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_option_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`option_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_tag_links` (
	`product_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`product_id`, `tag_id`)
);
--> statement-breakpoint
CREATE TABLE `product_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_tags_value_idx` ON `product_tags` (`value`);--> statement-breakpoint
CREATE TABLE `product_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_types_value_idx` ON `product_types` (`value`);--> statement-breakpoint
CREATE TABLE `product_variant_option_values` (
	`variant_id` integer NOT NULL,
	`option_value_id` integer NOT NULL,
	PRIMARY KEY(`variant_id`, `option_value_id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`title` text NOT NULL,
	`sku` text,
	`price_amount` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`handle` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`has_variants` integer DEFAULT false NOT NULL,
	`type_id` integer,
	`collection_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_handle_idx` ON `products` (`handle`);