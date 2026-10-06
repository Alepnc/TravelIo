CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`start_time` text NOT NULL,
	`duration_min` integer NOT NULL,
	`place_name` text,
	`lat` real,
	`lng` real,
	`cost` real DEFAULT 0 NOT NULL,
	`notes` text,
	`poi_id` text,
	`source` text DEFAULT 'generated' NOT NULL,
	`is_user_modified` integer DEFAULT false NOT NULL,
	`time_locked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `itinerary_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_day_idx` ON `activities` (`day_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text NOT NULL,
	`status` text DEFAULT 'da_prenotare' NOT NULL,
	`provider_ref` text,
	`amount` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`amount` real NOT NULL,
	`spent_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expenses_trip_idx` ON `expenses` (`trip_id`);--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`pace` text NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `itineraries_trip_id_unique` ON `itineraries` (`trip_id`);--> statement-breakpoint
CREATE TABLE `itinerary_days` (
	`id` text PRIMARY KEY NOT NULL,
	`itinerary_id` text NOT NULL,
	`day_index` integer NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`is_user_modified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `days_itinerary_index_idx` ON `itinerary_days` (`itinerary_id`,`day_index`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pace` text DEFAULT 'bilanciato' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`budget_level` text DEFAULT 'medio' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `travelers` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`is_owner` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trip_accommodations` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`provider` text NOT NULL,
	`offer_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`neighborhood` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`rating` real NOT NULL,
	`reviews_count` integer NOT NULL,
	`price_per_night` integer NOT NULL,
	`price_total` integer NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`free_cancellation` integer NOT NULL,
	`image_url` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trip_flights` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`direction` text NOT NULL,
	`provider` text NOT NULL,
	`offer_id` text NOT NULL,
	`airline` text NOT NULL,
	`airline_code` text NOT NULL,
	`flight_number` text NOT NULL,
	`from_code` text NOT NULL,
	`to_code` text NOT NULL,
	`depart_at` text NOT NULL,
	`arrive_at` text NOT NULL,
	`duration_min` integer NOT NULL,
	`stops` integer NOT NULL,
	`price_per_person` integer NOT NULL,
	`baggage` text NOT NULL,
	`conditions` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`destination_id` text NOT NULL,
	`destination_name` text NOT NULL,
	`country` text NOT NULL,
	`country_code` text NOT NULL,
	`destination_lat` real NOT NULL,
	`destination_lng` real NOT NULL,
	`image_url` text NOT NULL,
	`origin_code` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`travelers_count` integer DEFAULT 1 NOT NULL,
	`budget_per_person` integer,
	`pace` text DEFAULT 'bilanciato' NOT NULL,
	`status` text DEFAULT 'pianificazione' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trips_user_idx` ON `trips` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`home_airport` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);