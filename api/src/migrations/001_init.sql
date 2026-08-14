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
	UNIQUE (user_id, name)
);

-- No partial-receipt override columns: that escape hatch existed only so the old phantom demo
-- store could fake a "23-line receipt" without actually authoring 23 lines. A real backend has
-- no reason not to store every line of a real order, so subtotal/total/saved/item count are
-- always the real sum of order_items (see the order_totals view below) — never a stored figure
-- that could silently disagree with the lines underneath it.
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
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
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

CREATE TABLE attachments (
	id TEXT PRIMARY KEY,
	order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('pdf','image')),
	meta TEXT NOT NULL,
	content_type TEXT,
	size INTEGER,
	data BLOB               -- the real file bytes: a real backend can hold what the phantom store couldn't
);

CREATE TABLE settings (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	default_kind TEXT NOT NULL,
	default_status TEXT NOT NULL,
	page_size INTEGER NOT NULL,
	sort TEXT NOT NULL,
	show_scan_card INTEGER NOT NULL,
	confirm_delete INTEGER NOT NULL
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
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One place for order math (client.js:104-125's `decorate`, ported once here as real
-- aggregation) instead of re-deriving it per caller: every consumer — a single order fetch, the
-- list filter/sort, vendor/category rollups — reads this view with SUM/WHERE/ORDER BY/LIMIT
-- rather than loading rows into JS to compute it.
CREATE VIEW order_totals AS
SELECT
	o.id, o.user_id, o.vendor_id, o.date, o.status, o.kind, o.shipping, o.note, o.reference, o.refunded,
	COALESCE(li.item_count, 0) AS item_count,
	COALESCE(li.paid, 0) AS paid,
	COALESCE(li.retail, 0) AS retail,
	COALESCE(li.paid, 0) AS subtotal,
	COALESCE(li.paid, 0) + o.shipping AS total,
	COALESCE(li.retail, 0) - COALESCE(li.paid, 0) AS saved,
	CASE WHEN COALESCE(li.retail, 0) > 0
		THEN (COALESCE(li.retail, 0) - COALESCE(li.paid, 0)) / li.retail * 100
		ELSE 0 END AS saved_percent
FROM orders o
LEFT JOIN (
	SELECT order_id, COUNT(*) AS item_count, SUM(price * quantity) AS paid,
		SUM(COALESCE(retail, price) * quantity) AS retail
	FROM order_items
	GROUP BY order_id
) li ON li.order_id = o.id;

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_orders_user_date ON orders(user_id, date);
CREATE INDEX idx_orders_user_vendor ON orders(user_id, vendor_id);
CREATE INDEX idx_order_categories_cat ON order_categories(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_scan_uploads_user ON scan_uploads(user_id);
CREATE INDEX idx_attachments_order ON attachments(order_id);
