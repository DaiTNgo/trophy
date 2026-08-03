ALTER TABLE `orders` ADD `misa_sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `misa_contact_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `misa_sale_order_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `misa_last_error` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `misa_attempt_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `misa_synced_at` integer;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `misa_sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `misa_last_error` text;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `misa_synced_at` integer;