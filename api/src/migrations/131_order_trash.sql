-- A deleted order, kept for a short while so its toast can undo the delete (6d, 6f).
-- `rows` holds the order's own rows as JSON; the files' bytes sit beside it in order_trash_files.
CREATE TABLE order_trash (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	order_id TEXT NOT NULL,
	deleted_at INTEGER NOT NULL DEFAULT (unixepoch()),
	rows TEXT NOT NULL
);
CREATE INDEX idx_order_trash_user ON order_trash(user_id, deleted_at);
CREATE INDEX idx_order_trash_deleted ON order_trash(deleted_at);
CREATE TABLE order_trash_files (
	trash_id TEXT NOT NULL REFERENCES order_trash(id) ON DELETE CASCADE,
	attachment_id TEXT NOT NULL,
	data BLOB,
	thumbnail BLOB,
	PRIMARY KEY (trash_id, attachment_id)
);
