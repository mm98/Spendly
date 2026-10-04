-- A vendor's one optional image (Images and files 17e): stands in, faded, for the photo on its
-- orders that have none. One row per vendor, removed with it. The original is kept and never
-- served; the three renditions are what the pages draw, addressed by the original's hash.
CREATE TABLE vendor_images (
	vendor_id TEXT PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	hash TEXT NOT NULL,
	original BLOB NOT NULL,
	original_type TEXT NOT NULL,
	square_128 BLOB NOT NULL,
	square_256 BLOB NOT NULL,
	wide_1080 BLOB NOT NULL,
	created_at INTEGER NOT NULL
);
