CREATE TABLE `collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`color` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collaborators_document_email_unique` ON `collaborators` (`document_id`,`email`);--> statement-breakpoint
CREATE TABLE `comment_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`content` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`content` text NOT NULL,
	`quoted_text` text NOT NULL,
	`author_email` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`state` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_snapshots_document_id_unique` ON `document_snapshots` (`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`title` text DEFAULT 'Untitled Document' NOT NULL,
	`finalized` integer DEFAULT false NOT NULL,
	`finalized_by` text,
	`finalized_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
