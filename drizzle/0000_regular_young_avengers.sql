CREATE TABLE `study_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`study_id` text NOT NULL,
	`study_version` text NOT NULL,
	`jspsych_version` text NOT NULL,
	`session_started_utc` text NOT NULL,
	`session_completed_utc` text NOT NULL,
	`frame_condition` text NOT NULL,
	`primary_trust` integer NOT NULL,
	`comfort_with_use` integer NOT NULL,
	`perceived_reliability` integer NOT NULL,
	`trust_index` real NOT NULL,
	`reliance_choice` text NOT NULL,
	`reliance_order` text NOT NULL,
	`recalled_frame` text NOT NULL,
	`recall_correct` integer NOT NULL,
	`recall_order` text NOT NULL,
	`stakeholder_role` text NOT NULL,
	`health_ai_familiarity` text NOT NULL,
	`consent_rt_ms` integer NOT NULL,
	`frame_rt_ms` integer NOT NULL,
	`trust_rt_ms` integer NOT NULL,
	`reliance_rt_ms` integer NOT NULL,
	`recall_rt_ms` integer NOT NULL,
	`background_rt_ms` integer NOT NULL,
	`total_elapsed_ms` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_responses_participant_id_unique` ON `study_responses` (`participant_id`);--> statement-breakpoint
CREATE INDEX `study_responses_condition_idx` ON `study_responses` (`frame_condition`);--> statement-breakpoint
CREATE INDEX `study_responses_created_at_idx` ON `study_responses` (`created_at`);