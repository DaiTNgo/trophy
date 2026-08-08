CREATE TABLE `order_item_media_transfer_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text NOT NULL,
	`role` text NOT NULL,
	`field_id` text,
	`source_asset_id` text NOT NULL,
	`source_object_key` text NOT NULL,
	`target_object_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_item_media_transfer_assets_transfer_idx` ON `order_item_media_transfer_assets` (`transfer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `order_item_media_transfer_assets_target_idx` ON `order_item_media_transfer_assets` (`target_object_key`);--> statement-breakpoint
CREATE TABLE `order_item_media_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_item_media_transfers_item_idx` ON `order_item_media_transfers` (`order_item_id`);--> statement-breakpoint
ALTER TABLE `customization_assets` ADD `ownership_type` text;--> statement-breakpoint
ALTER TABLE `customization_assets` ADD `shopper_draft_id` text;--> statement-breakpoint
ALTER TABLE `customization_assets` ADD `shopper_field_id` text;--> statement-breakpoint
ALTER TABLE `customization_assets` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `customization_assets` ADD `expiry_protected` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `customization_assets_expiry_idx` ON `customization_assets` (`ownership_type`,`expires_at`,`expiry_protected`);