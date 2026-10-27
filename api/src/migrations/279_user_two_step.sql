-- Two-step sign-in: a code from an authenticator app after the password. One row per account that
-- has started turning it on; turned_on_at stays NULL until the first right code. The app's key is
-- stored locked (lib/secretBox.js), never as plain text.
CREATE TABLE user_two_step (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	secret BLOB NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	turned_on_at INTEGER,
	-- the 30-second step of the last code accepted, so no code is accepted twice
	last_step INTEGER NOT NULL DEFAULT 0
);

-- The one-time codes that stand in for the app. Only a hash is kept; a used code is deleted.
CREATE TABLE user_two_step_recovery_codes (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	code_hash TEXT NOT NULL,
	PRIMARY KEY (user_id, code_hash)
) WITHOUT ROWID;

-- Wrong codes, counted per account for the lock-out.
CREATE TABLE user_two_step_failures (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	at INTEGER NOT NULL
);
CREATE INDEX idx_user_two_step_failures_user ON user_two_step_failures(user_id, at);
