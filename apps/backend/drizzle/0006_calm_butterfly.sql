CREATE TABLE `product_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`width_px` integer,
	`height_px` integer,
	`byte_size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `product_assets_owner_key_idx` ON `product_assets` (`owner_key`);
