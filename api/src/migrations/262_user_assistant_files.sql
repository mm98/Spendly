-- A file Ask Spendly made for the reader from their own data (24d, 24e). The bytes are on disk in the
-- account's folder in SPENDLY_STORAGE (lib/storage.js), outside the database and its backup, under the
-- random name in `stored_name`, which is NULL once they are removed.
-- Kept for 30 days, then the sweep removes it. A deleted file keeps its row without its bytes until then,
-- so an answer that named it can say "Deleted" and not "Removed after 30 days". One that could not be
-- made has no bytes and says why, so the emailed conversation can say it too.
CREATE TABLE user_assistant_files (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	type TEXT NOT NULL CHECK (type IN ('xlsx', 'docx', 'pdf', 'csv')),
	-- the moment the question was asked, in the reader's own time zone: 2026-10-22T14-05, for the file's name
	asked_at TEXT NOT NULL,
	size INTEGER NOT NULL DEFAULT 0,
	stored_name TEXT,
	failed_reason TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	-- the last day it is kept, YYYY-MM-DD in the reader's own calendar
	kept_until TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	deleted_at INTEGER
);
CREATE INDEX user_assistant_files_user ON user_assistant_files (user_id, created_at);
CREATE INDEX user_assistant_files_expiry ON user_assistant_files (expires_at);
-- the sweep reads it every minute; only a deleted file whose bytes are still on disk is in it
CREATE INDEX user_assistant_files_deleted ON user_assistant_files (deleted_at) WHERE deleted_at IS NOT NULL AND stored_name IS NOT NULL;

-- A chart Ask Spendly drew in an answer, kept as long as a file so the emailed conversation can draw it again.
CREATE TABLE user_assistant_charts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	chart TEXT NOT NULL,
	expires_at INTEGER NOT NULL
);
CREATE INDEX user_assistant_charts_expiry ON user_assistant_charts (expires_at);

-- the files made on each of the reader's days, beside the questions answered: the daily limit on files reads it
ALTER TABLE user_assistant_days ADD COLUMN made_files_count INTEGER NOT NULL DEFAULT 0;
