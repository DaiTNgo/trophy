CREATE TABLE `r2_cleanup_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`last_error` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `r2_cleanup_jobs_pending_idx` ON `r2_cleanup_jobs` (`completed_at`,`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `r2_cleanup_jobs_object_key_idx` ON `r2_cleanup_jobs` (`object_key`);--> statement-breakpoint
ALTER TABLE `product_variant_attributes` ADD `write_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_attributes_write_token_idx` ON `product_variant_attributes` (`write_token`);--> statement-breakpoint
ALTER TABLE `product_variants` ADD `write_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_write_token_idx` ON `product_variants` (`write_token`);