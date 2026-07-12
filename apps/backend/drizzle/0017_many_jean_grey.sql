CREATE TABLE `customization_clipart_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`source_asset_id` text NOT NULL,
	`name` text NOT NULL,
	`file_name` text,
	`preview_url` text NOT NULL,
	`mime_type` text NOT NULL,
	`source_width_px` integer,
	`source_height_px` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customization_clipart_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
