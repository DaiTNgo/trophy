CREATE TABLE `product_customizations` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`canvas_width_px` integer,
	`canvas_height_px` integer,
	`layers_json` text DEFAULT '[]' NOT NULL,
	`form_fields_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_customizations_product_idx` ON `product_customizations` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_variant_media` (
	`variant_id` integer NOT NULL,
	`asset_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`variant_id`, `asset_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_media_variant_position_idx` ON `product_variant_media` (`variant_id`,`position`);--> statement-breakpoint
ALTER TABLE `product_categories` ADD `description` text;--> statement-breakpoint
ALTER TABLE `product_categories` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `product_collections` ADD `description` text;--> statement-breakpoint
ALTER TABLE `product_collections` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `product_collections` ADD `position` integer DEFAULT 0 NOT NULL;