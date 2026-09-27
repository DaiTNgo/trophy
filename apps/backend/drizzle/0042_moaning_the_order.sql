ALTER TABLE `product_option_values` ADD `color_hex` text;--> statement-breakpoint
ALTER TABLE `product_option_values` ADD `swatch_asset_id` text;--> statement-breakpoint
ALTER TABLE `product_options` ADD `display_type` text DEFAULT 'text' NOT NULL;