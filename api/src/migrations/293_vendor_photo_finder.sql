-- The photo finder a vendor's orders use for lines with no photo (Vendors and categories 5b); NULL is Off.
ALTER TABLE vendors ADD COLUMN photo_finder TEXT;

-- Product photos a finder found, shared by every account: the same product on any receipt reuses
-- its photo instead of searching again. Only a finder writes here, never a reader's own upload.
CREATE TABLE found_photos (
	finder TEXT NOT NULL,
	product_key TEXT NOT NULL,
	image BLOB NOT NULL,
	content_type TEXT NOT NULL,
	source_url TEXT NOT NULL,
	found_at INTEGER NOT NULL,
	PRIMARY KEY (finder, product_key)
);
