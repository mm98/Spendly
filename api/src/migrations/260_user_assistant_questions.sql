-- A question the reader saved on Ask Spendly, to ask again with one press. A few per account, so the
-- unique pair is also the index a reader's list is read through.
CREATE TABLE user_assistant_questions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	question TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	UNIQUE (user_id, question)
);
