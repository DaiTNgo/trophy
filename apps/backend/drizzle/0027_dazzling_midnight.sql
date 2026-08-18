PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `product_media_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`asset_id` text NOT NULL,
	`position` integer NOT NULL
);--> statement-breakpoint
DROP TABLE `product_media`;--> statement-breakpoint
ALTER TABLE `product_media_new` RENAME TO `product_media`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_media_product_asset_idx` ON `product_media` (`product_id`,`asset_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `products` ADD `thumbnail_asset_id` text;
