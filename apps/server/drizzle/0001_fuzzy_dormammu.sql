ALTER TABLE `documents` ADD `approved` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `approved_at` integer;