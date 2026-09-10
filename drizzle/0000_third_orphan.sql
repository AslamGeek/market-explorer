CREATE TABLE `analysis_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`ip_hash` text NOT NULL,
	`browser_hash` text NOT NULL,
	`session_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `usage_ip` ON `analysis_usage` (`day`,`ip_hash`);--> statement-breakpoint
CREATE INDEX `usage_browser` ON `analysis_usage` (`day`,`browser_hash`);--> statement-breakpoint
CREATE INDEX `usage_session` ON `analysis_usage` (`day`,`session_hash`);