CREATE TABLE `bank_transfer_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`bank` text NOT NULL,
	`reference` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`receipt_url` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`submitted_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_transfer_submissions_order_id_unique` ON `bank_transfer_submissions` (`order_id`);
