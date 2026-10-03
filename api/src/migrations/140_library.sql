-- A vendor kept out of the vendor list and the order list's filters. Its orders keep it.
ALTER TABLE vendors ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- When an order last found its vendor by this alias, so the vendor page can show which one it was.
ALTER TABLE vendor_aliases ADD COLUMN matched_at INTEGER;

-- A merge cannot be undone, so each one leaves a record of what it moved and where.
CREATE TABLE merges (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('vendor', 'category')),
	source_name TEXT NOT NULL,
	target_id TEXT NOT NULL,
	orders INTEGER NOT NULL,
	merged_at INTEGER NOT NULL DEFAULT (unixepoch())
);
