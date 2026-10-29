CREATE TABLE fcm_devices (
 id varchar(191) PRIMARY KEY NOT NULL,
 user_id varchar(191) NOT NULL,
 session_id varchar(191) NOT NULL,
 installation_id varchar(191) NOT NULL,
 token longtext NOT NULL,
 token_hash varchar(191) NOT NULL,
 created_at bigint NOT NULL,
 updated_at bigint NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX fcm_devices_token_idx ON fcm_devices(token_hash);
--> statement-breakpoint
CREATE UNIQUE INDEX fcm_devices_user_installation_idx ON fcm_devices(user_id,installation_id);
--> statement-breakpoint
CREATE INDEX fcm_devices_session_idx ON fcm_devices(session_id);
--> statement-breakpoint
