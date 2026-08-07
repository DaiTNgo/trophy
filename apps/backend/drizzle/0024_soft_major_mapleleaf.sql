ALTER TABLE `product_categories` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_collections` ADD `visibility` text DEFAULT 'public' NOT NULL;