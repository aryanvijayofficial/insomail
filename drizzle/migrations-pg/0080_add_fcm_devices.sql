CREATE TABLE fcm_devices (
 id text PRIMARY KEY NOT NULL,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 installation_id text NOT NULL,
 token text NOT NULL,
 token_hash text NOT NULL,
 created_at bigint NOT NULL,
 updated_at bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX fcm_devices_token_idx ON fcm_devices(token_hash);
--> statement-breakpoint
CREATE UNIQUE INDEX fcm_devices_user_installation_idx ON fcm_devices(user_id,installation_id);
--> statement-breakpoint
CREATE INDEX fcm_devices_session_idx ON fcm_devices(session_id);
--> statement-breakpoint
