-- The weekly or monthly status email (20f). zone and locale are the browser's own, taken when the
-- setting is chosen, since the email is sent with no browser to ask. sent is the last period sent.
ALTER TABLE user_settings ADD COLUMN status_email TEXT NOT NULL DEFAULT 'none' CHECK (status_email IN ('none', 'weekly', 'monthly'));
ALTER TABLE user_settings ADD COLUMN status_email_zone TEXT;
ALTER TABLE user_settings ADD COLUMN status_email_locale TEXT;
ALTER TABLE user_settings ADD COLUMN status_email_sent TEXT;

-- A status email carries a single-use link that stops these emails.
CREATE TABLE user_tokens_new (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('confirm', 'reset', 'status-stop')),
	email TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	used_at INTEGER,
	created_at INTEGER NOT NULL
);
INSERT INTO user_tokens_new SELECT token_hash, user_id, kind, email, expires_at, used_at, created_at FROM user_tokens;
DROP TABLE user_tokens;
ALTER TABLE user_tokens_new RENAME TO user_tokens;
CREATE INDEX idx_user_tokens_user_kind ON user_tokens(user_id, kind);
