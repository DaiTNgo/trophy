CREATE TABLE `catalog_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_type` text NOT NULL,
	`owner_key` text NOT NULL,
	`field_name` text NOT NULL,
	`locale` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_translations_unique_idx` ON `catalog_translations` (`owner_type`,`owner_key`,`field_name`,`locale`);