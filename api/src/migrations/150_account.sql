-- The account itself: a name and a picture, when the password last changed, whether the email is
-- confirmed, how long a session lasts, failed sign-ins and the single-use links that confirm an
-- address or reset a password.
--
-- email_confirmed defaults to 1 so accounts that already exist are not held; registration writes
-- 0 only when this server can send the confirming link.
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN password_changed_at INTEGER;
ALTER TABLE users ADD COLUMN email_confirmed INTEGER NOT NULL DEFAULT 1;
-- an address asked for but not yet confirmed; the old one keeps working until it is
ALTER TABLE users ADD COLUMN pending_email TEXT;

CREATE TABLE user_pictures (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	data BLOB NOT NULL,
	content_type TEXT NOT NULL,
	updated_at INTEGER NOT NULL
);

-- 1: stays signed in for 30 days; 0: ends when the browser closes, or after a day
ALTER TABLE sessions ADD COLUMN remember INTEGER NOT NULL DEFAULT 1;

CREATE TABLE login_failures (
	email TEXT NOT NULL,
	at INTEGER NOT NULL
);
CREATE INDEX idx_login_failures_email_at ON login_failures(email, at);

-- only a hash of the token is kept, so a copy of the database cannot be used to follow a link
CREATE TABLE account_tokens (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('confirm', 'reset')),
	email TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	used_at INTEGER,
	created_at INTEGER NOT NULL
);
CREATE INDEX idx_account_tokens_user_kind ON account_tokens(user_id, kind);
