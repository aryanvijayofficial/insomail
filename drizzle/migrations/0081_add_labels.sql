CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mailbox_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#2563eb' NOT NULL,
	`parent_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mailbox_id`) REFERENCES `mailboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_mailbox_root_name_idx` ON `labels` (`mailbox_id`,`name` COLLATE NOCASE) WHERE `parent_id` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_mailbox_parent_name_idx` ON `labels` (`mailbox_id`,`parent_id`,`name` COLLATE NOCASE) WHERE `parent_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `labels_mailbox_idx` ON `labels` (`mailbox_id`);
--> statement-breakpoint
CREATE INDEX `labels_user_idx` ON `labels` (`user_id`);
--> statement-breakpoint
CREATE TABLE `message_labels` (
	`message_id` text NOT NULL,
	`label_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_labels_pair_idx` ON `message_labels` (`message_id`,`label_id`);
--> statement-breakpoint
CREATE INDEX `message_labels_label_idx` ON `message_labels` (`label_id`,`message_id`);
