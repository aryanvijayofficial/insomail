-- InsoMail modification, 2026-10-29. Free local plan preference only.
ALTER TABLE users ADD COLUMN insomail_plan varchar(32) NOT NULL DEFAULT 'professional';
