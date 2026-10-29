CREATE TABLE `labels` (
	`id` varchar(191) PRIMARY KEY NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`mailbox_id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`color` varchar(191) DEFAULT '#2563eb' NOT NULL,
	`parent_id` varchar(191),
	`created_at` bigint NOT NULL DEFAULT (unix_timestamp()),
	CONSTRAINT `labels_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
	CONSTRAINT `labels_mailbox_id_mailboxes_id_fk` FOREIGN KEY (`mailbox_id`) REFERENCES `mailboxes`(`id`) ON DELETE cascade,
	CONSTRAINT `labels_parent_id_labels_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `labels`(`id`) ON DELETE cascade
);
--> statement-breakpoint
-- MySQL has no partial indexes and NULL parents compare distinct, so root-sibling
-- uniqueness is enforced by the API (findLabelSiblingConflict); the child-sibling
-- index below is case-insensitive through the column collation.
CREATE UNIQUE INDEX `labels_mailbox_parent_name_idx` ON `labels` (`mailbox_id`, `parent_id`, `name`);
--> statement-breakpoint
CREATE INDEX `labels_mailbox_idx` ON `labels` (`mailbox_id`);
--> statement-breakpoint
CREATE INDEX `labels_user_idx` ON `labels` (`user_id`);
--> statement-breakpoint
CREATE TABLE `message_labels` (
	`message_id` varchar(191) NOT NULL,
	`label_id` varchar(191) NOT NULL,
	`created_at` bigint NOT NULL DEFAULT (unix_timestamp()),
	CONSTRAINT `message_labels_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade,
	CONSTRAINT `message_labels_label_id_labels_id_fk` FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_labels_pair_idx` ON `message_labels` (`message_id`, `label_id`);
--> statement-breakpoint
CREATE INDEX `message_labels_label_idx` ON `message_labels` (`label_id`, `message_id`);
