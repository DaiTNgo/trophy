CREATE TABLE `product_variant_customization_media` (
	`variant_id` integer PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_customization_media_asset_id_unique` ON `product_variant_customization_media` (`asset_id`);