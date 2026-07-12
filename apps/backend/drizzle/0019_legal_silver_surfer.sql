CREATE TABLE `product_variant_attributes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`unit` text,
	`position` integer NOT NULL
);
