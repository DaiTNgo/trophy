CREATE TABLE `customization_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`object_key` text NOT NULL,
	`preview_object_key` text,
	`mime_type` text NOT NULL,
	`width_px` integer,
	`height_px` integer,
	`byte_size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customization_design_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`design_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`document_json` text NOT NULL,
	`validation_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`frozen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customization_design_revision_idx` ON `customization_design_revisions` (`design_id`,`revision`);--> statement-breakpoint
CREATE TABLE `customization_designs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`template_revision_id` text NOT NULL,
	`current_revision` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customization_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`design_revision_id` text NOT NULL,
	`profile_revision` integer DEFAULT 1 NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`object_key` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customization_export_deterministic_idx` ON `customization_exports` (`design_revision_id`,`profile_revision`,`format`);--> statement-breakpoint
CREATE TABLE `customization_template_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`preview_asset_key` text,
	`preview_url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customization_template_revision_idx` ON `customization_template_revisions` (`template_id`,`revision`);--> statement-breakpoint
CREATE TABLE `customization_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`active_revision_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customization_templates_product_idx` ON `customization_templates` (`product_id`);--> statement-breakpoint
CREATE TABLE `customization_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`template_revision_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`preview_x_ratio` real NOT NULL,
	`preview_y_ratio` real NOT NULL,
	`preview_width_ratio` real NOT NULL,
	`preview_height_ratio` real NOT NULL,
	`rotation_deg` real DEFAULT 0 NOT NULL,
	`width_mm` real NOT NULL,
	`height_mm` real NOT NULL,
	`bleed_mm` real DEFAULT 0 NOT NULL,
	`safe_margin_mm` real DEFAULT 0 NOT NULL,
	`allowed_content_json` text NOT NULL,
	`text_rules_json` text NOT NULL,
	`production_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customization_zone_revision_name_idx` ON `customization_zones` (`template_revision_id`,`name`);