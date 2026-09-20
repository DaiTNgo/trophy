CREATE TABLE `product_collection_links` (
	`product_id` integer NOT NULL,
	`collection_id` integer NOT NULL,
	PRIMARY KEY(`product_id`, `collection_id`)
);
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `collection_id`;