-- How many questions an account's assistant answered on each of the reader's days: the daily limit reads it.
CREATE TABLE user_assistant_days (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day TEXT NOT NULL,
	answered_count INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (user_id, day)
) WITHOUT ROWID;
