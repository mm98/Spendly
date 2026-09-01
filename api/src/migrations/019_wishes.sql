-- A wish: something the user wants but has not bought. Its own table rather than an order in
-- a "wanted" status -- an order is money that left the account, and every total, chart and
-- budget in the app reads the orders table on exactly that assumption.
--
-- Name and url are the two required columns, because a wish nobody can find again is a note,
-- not a wish. price is nullable and that is the point: NULL is "not written down yet", which
-- is a different fact from 0.
CREATE TABLE wishes (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	url TEXT NOT NULL,
	price REAL,
	archived INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	-- The wish's one picture, carried on the row the way scan_uploads carries its own bytes.
	-- A wish has a photo, not a list of files, so it needs neither an attachments row nor a
	-- third owner column on that table (whose CHECK admits exactly one of two owners).
	-- photo_id changes whenever the picture is replaced and rides in the URL the browser
	-- fetches, so a thumbnail can be cached immutably and a replaced photo still appears.
	photo_id TEXT,
	photo_content_type TEXT,
	photo_size INTEGER,
	photo_data BLOB,
	photo_data_is_compressed INTEGER NOT NULL DEFAULT 0,
	photo_thumbnail BLOB,
	photo_thumbnail_is_compressed INTEGER NOT NULL DEFAULT 0,
	photo_thumbnail_content_type TEXT
);

-- Same shape as order_categories: a wish may carry several categories, or none. No count is
-- stored beside it -- nothing divides a wish's price across its categories the way the spend
-- rollups divide an order's total, so there is no per-read aggregate for a column to save.
CREATE TABLE wish_categories (
	wish_id TEXT NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
	category_id TEXT NOT NULL REFERENCES categories(id),
	PRIMARY KEY (wish_id, category_id)
);
