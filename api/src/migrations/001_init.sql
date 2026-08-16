-- Spendly schema. Every domain table carries user_id, so one login sees one dataset.
-- Dates and timestamps are unix seconds (INTEGER): SQLite has no date/time storage class,
-- and integers give plain range comparisons and index-friendly scans for free.

CREATE TABLE users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE vendors (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	initials TEXT NOT NULL,
	colour TEXT NOT NULL,
	favourite INTEGER NOT NULL DEFAULT 0,
	lead TEXT,
	UNIQUE (user_id, name)
);

CREATE TABLE categories (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	icon TEXT NOT NULL DEFAULT 'tag',
	icon_path TEXT,
	colour TEXT NOT NULL,
	budget REAL NOT NULL DEFAULT 0,
	favourite INTEGER NOT NULL DEFAULT 0,
	UNIQUE (user_id, name)
);

-- Totals are stored on the order row itself and maintained by the order_items triggers below —
-- never computed per read. This used to be a view (order_totals) aggregating order_items on
-- every query, which reprices the whole table to answer any list, stats or search question;
-- at hundreds of accounts with thousands of orders each, that GROUP BY is the cost of every
-- read. The triggers are the consistency guarantee the view used to give: no code path can
-- write an item without SQLite itself refreshing the parent order's figures, so the stored
-- numbers can never silently disagree with the lines underneath them. item_count/paid/retail
-- are the trigger-maintained aggregates; subtotal/total/saved/saved_percent are STORED
-- generated columns derived from them, so the whole shape is readable (and indexable) as
-- plain columns.
CREATE TABLE orders (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vendor_id TEXT NOT NULL REFERENCES vendors(id),
	date INTEGER NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('Ordered','Delivered','Returned')),
	kind TEXT NOT NULL CHECK (kind IN ('Expense','Gift','Sold','Work','Other')),
	shipping REAL NOT NULL DEFAULT 0,
	note TEXT NOT NULL DEFAULT '',
	reference TEXT NOT NULL DEFAULT '',
	refunded INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	item_count INTEGER NOT NULL DEFAULT 0,
	paid REAL NOT NULL DEFAULT 0,
	retail REAL NOT NULL DEFAULT 0,
	subtotal REAL GENERATED ALWAYS AS (paid) STORED,
	total REAL GENERATED ALWAYS AS (paid + shipping) STORED,
	saved REAL GENERATED ALWAYS AS (retail - paid) STORED,
	saved_percent REAL GENERATED ALWAYS AS
		(CASE WHEN retail > 0 THEN (retail - paid) / retail * 100 ELSE 0 END) STORED
);

CREATE TABLE order_categories (
	order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	category_id TEXT NOT NULL REFERENCES categories(id),
	PRIMARY KEY (order_id, category_id)
);

CREATE TABLE order_items (
	id TEXT PRIMARY KEY,
	order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	position INTEGER NOT NULL,
	title TEXT NOT NULL,
	quantity REAL NOT NULL,
	price REAL NOT NULL,
	retail REAL,
	note TEXT
);

-- A file that belongs to exactly one thing: the order as a whole (its receipt) or one of its
-- own items (a photo, or eventually a PDF, of that particular product) -- never both, never
-- neither. Both owners want the same storage shape -- bytes, kind, a thumbnail -- so one table
-- holds both rather than growing a second copy of it on order_items; which row owns a given
-- attachment is just whichever of the two FKs below is not null.
CREATE TABLE attachments (
	id TEXT PRIMARY KEY,
	order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
	order_item_id TEXT REFERENCES order_items(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('pdf','image')),
	meta TEXT NOT NULL,
	content_type TEXT,
	size INTEGER,
	data BLOB,               -- the real file bytes: a real backend can hold what the phantom store couldn't
	-- Uploaded images are resized on the way in (see lib/images.js: 1600px display, 200px
	-- thumbnail) rather than stored at whatever resolution a phone camera produced. The thumbnail
	-- is its own small BLOB, served from its own endpoint, so a list of attachments never has to
	-- pull the (still much larger) display image just to draw an icon-sized preview.
	thumbnail BLOB,
	thumbnail_content_type TEXT,
	CHECK ((order_id IS NULL) != (order_item_id IS NULL))
);

CREATE TABLE settings (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	default_kind TEXT NOT NULL,
	default_status TEXT NOT NULL,
	page_size INTEGER NOT NULL,
	sort TEXT NOT NULL,
	show_scan_card INTEGER NOT NULL,
	confirm_delete INTEGER NOT NULL,
	-- card_rows: how many entries a card on Home fills with — a fact about the account, not the
	-- build, since the cards share a grid row and the number decides how much of it each uses.
	-- list_sort: the order the vendors and categories lists open in — one column because it is
	-- one answer to one question, stored as key-with-direction ('name-asc' | 'spend-desc' |
	-- 'saved-desc') so the printed label can change without rewriting rows.
	card_rows INTEGER NOT NULL DEFAULT 6,
	list_sort TEXT NOT NULL DEFAULT 'name-asc'
);

CREATE TABLE dashboard_cards (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	key TEXT NOT NULL,
	position INTEGER NOT NULL,
	on_dashboard INTEGER NOT NULL,
	PRIMARY KEY (user_id, key)
);

-- A dropped-but-not-yet-reviewed receipt. Real bytes (there is no OCR behind this — see
-- routes/scan.js — so the draft it produces is honestly blank, not a faked read of the file),
-- kept until review turns it into an order, at which point its bytes become that order's own
-- attachment (see /scan/documents/:key/attach) rather than asking the browser to upload twice.
CREATE TABLE scan_uploads (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	size INTEGER,
	kind TEXT,
	content_type TEXT,
	data BLOB,
	thumbnail BLOB,
	thumbnail_content_type TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One place for order math: the three triggers below refresh the parent order's stored
-- aggregates on every item write, inside the same transaction as the write itself. Each
-- recomputes from the order's own items (an indexed handful of rows) rather than adjusting
-- incrementally, so repeated edits can never accumulate floating-point drift. Every consumer —
-- a single order fetch, the list filter/sort, vendor/category rollups, stats windows — reads
-- the stored columns straight off `orders` with no join and no GROUP BY.
CREATE TRIGGER order_items_totals_insert AFTER INSERT ON order_items
BEGIN
	UPDATE orders SET (item_count, paid, retail) = (
		SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
		FROM order_items WHERE order_id = NEW.order_id
	) WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_items_totals_update AFTER UPDATE ON order_items
BEGIN
	UPDATE orders SET (item_count, paid, retail) = (
		SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
		FROM order_items WHERE order_id = OLD.order_id
	) WHERE id = OLD.order_id;
	-- An item never moves between orders through the app, but a trigger guards the schema, not
	-- the app: if one ever does, both sides come out right.
	UPDATE orders SET (item_count, paid, retail) = (
		SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
		FROM order_items WHERE order_id = NEW.order_id
	) WHERE id = NEW.order_id AND NEW.order_id <> OLD.order_id;
END;

CREATE TRIGGER order_items_totals_delete AFTER DELETE ON order_items
BEGIN
	UPDATE orders SET (item_count, paid, retail) = (
		SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
		FROM order_items WHERE order_id = OLD.order_id
	) WHERE id = OLD.order_id;
END;

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_orders_user_date ON orders(user_id, date);
-- total is a STORED generated column, so it is indexable: this serves the orders list's
-- amount sorts and min/max amount filters without a scan-and-sort over the account's rows.
CREATE INDEX idx_orders_user_total ON orders(user_id, total);
CREATE INDEX idx_orders_user_vendor ON orders(user_id, vendor_id);
CREATE INDEX idx_order_categories_cat ON order_categories(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_scan_uploads_user ON scan_uploads(user_id);
CREATE INDEX idx_attachments_order ON attachments(order_id);
CREATE INDEX idx_attachments_item ON attachments(order_item_id);
