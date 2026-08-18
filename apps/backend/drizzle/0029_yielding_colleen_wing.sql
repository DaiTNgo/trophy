CREATE TABLE `misa_deletion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`misa_product_id` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`last_error` text,
	`completed_at` text,
	`lease_token` text,
	`lease_expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `misa_deletion_jobs_pending_idx` ON `misa_deletion_jobs` (`completed_at`,`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `misa_deletion_jobs_product_id_idx` ON `misa_deletion_jobs` (`misa_product_id`);--> statement-breakpoint
ALTER TABLE `r2_cleanup_jobs` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `r2_cleanup_jobs` ADD `lease_expires_at` text;