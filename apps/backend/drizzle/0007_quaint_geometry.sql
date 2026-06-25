ALTER TABLE `customization_template_revisions`
  ADD `preview_width_px` integer DEFAULT 0 NOT NULL;

ALTER TABLE `customization_template_revisions`
  ADD `preview_height_px` integer DEFAULT 0 NOT NULL;
