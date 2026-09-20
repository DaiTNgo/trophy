CREATE TABLE `article_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_categories_slug_idx` ON `article_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `article_category_links` (
	`article_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `category_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `article_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `article_product_links` (
	`article_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`article_id`, `product_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_product_links_article_id_idx` ON `article_product_links` (`article_id`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`content_html` text DEFAULT '' NOT NULL,
	`content_json` text,
	`featured_image_url` text,
	`featured_image_alt` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_id` text,
	`published_at` integer,
	`meta_title` text,
	`meta_description` text,
	`og_image_url` text,
	`canonical_url` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_idx` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_status_published_at_idx` ON `articles` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `articles_author_id_idx` ON `articles` (`author_id`);