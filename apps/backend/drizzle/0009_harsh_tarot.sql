CREATE TABLE `brand_color` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hex_code` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `font_family` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`regular_asset_id` text,
	`bold_asset_id` text,
	`italic_asset_id` text,
	`bold_italic_asset_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
