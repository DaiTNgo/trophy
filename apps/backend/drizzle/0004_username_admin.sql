ALTER TABLE `user` ADD COLUMN `username` text;--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `display_username` text;--> statement-breakpoint
UPDATE `user` SET `username` = lower(trim(`email`)), `display_username` = `name` WHERE `username` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
