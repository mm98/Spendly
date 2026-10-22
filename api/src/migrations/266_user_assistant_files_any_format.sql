-- A file's type is any format in api/src/format/file/formats.js, so a new format needs no change here.
CREATE TABLE user_assistant_files_new (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	-- the format's type, which is also the file's ending: xlsx, csv, docx, pdf
	type TEXT NOT NULL,
	asked_at TEXT NOT NULL,
	size INTEGER NOT NULL DEFAULT 0,
	stored_name TEXT,
	failed_reason TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	kept_until TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	deleted_at INTEGER,
	download_name TEXT,
	chat_id TEXT REFERENCES user_assistant_chats(id) ON DELETE SET NULL
);
INSERT INTO user_assistant_files_new (id, user_id, title, type, asked_at, size, stored_name, failed_reason, created_at, kept_until, expires_at, deleted_at, download_name, chat_id)
	SELECT id, user_id, title, type, asked_at, size, stored_name, failed_reason, created_at, kept_until, expires_at, deleted_at, download_name, chat_id FROM user_assistant_files;
DROP TABLE user_assistant_files;
ALTER TABLE user_assistant_files_new RENAME TO user_assistant_files;
CREATE INDEX user_assistant_files_user ON user_assistant_files (user_id, created_at);
CREATE INDEX user_assistant_files_expiry ON user_assistant_files (expires_at);
CREATE INDEX user_assistant_files_deleted ON user_assistant_files (deleted_at) WHERE deleted_at IS NOT NULL AND stored_name IS NOT NULL;
CREATE INDEX user_assistant_files_chat ON user_assistant_files (chat_id) WHERE chat_id IS NOT NULL;
