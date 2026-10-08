-- An order not created yet (Order create 3a): the form as it was left, and the file it was scanned
-- from when it came from a scan. Kept apart from orders, which never carry a review's marks; the API
-- shows a draft as an order with status Draft.
CREATE TABLE order_drafts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	upload_id TEXT UNIQUE REFERENCES scan_uploads(id) ON DELETE CASCADE,
	-- the form as JSON: its values, and its lines with their ticks and marks; NULL until first edited
	form TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_order_drafts_user ON order_drafts(user_id, created_at);

-- The other uploads a draft holds: files added to it and line photos. The cleanup leaves them while it lives.
CREATE TABLE order_draft_files (
	draft_id TEXT NOT NULL REFERENCES order_drafts(id) ON DELETE CASCADE,
	upload_id TEXT NOT NULL REFERENCES scan_uploads(id) ON DELETE CASCADE,
	PRIMARY KEY (draft_id, upload_id)
);
