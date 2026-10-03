-- An account's own statuses (Settings 11a): the five every account starts with, renamed,
-- recoloured, reordered, added to. orders.status holds a status's key: a built-in status keeps
-- its English name as its key whatever it is renamed to; one the account adds is keyed by its id.
CREATE TABLE statuses (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	key TEXT NOT NULL,
	name TEXT NOT NULL,
	tone TEXT NOT NULL CHECK (tone IN ('success','progress','danger','neutral')),
	position INTEGER NOT NULL,
	UNIQUE (user_id, key)
);

INSERT INTO statuses (id, user_id, key, name, tone, position)
SELECT 'st-' || u.id || '-' || lower(s.key), u.id, s.key, s.key, s.tone, s.position
FROM users u CROSS JOIN (
	SELECT 'Draft' AS key, 'neutral' AS tone, 0 AS position UNION ALL
	SELECT 'Ordered', 'progress', 1 UNION ALL
	SELECT 'Delivered', 'success', 2 UNION ALL
	SELECT 'Returned', 'danger', 3 UNION ALL
	SELECT 'Cancelled', 'neutral', 4
) s;

CREATE TRIGGER users_statuses_seed AFTER INSERT ON users
BEGIN
	INSERT INTO statuses (id, user_id, key, name, tone, position) VALUES
		('st-' || NEW.id || '-draft', NEW.id, 'Draft', 'Draft', 'neutral', 0),
		('st-' || NEW.id || '-ordered', NEW.id, 'Ordered', 'Ordered', 'progress', 1),
		('st-' || NEW.id || '-delivered', NEW.id, 'Delivered', 'Delivered', 'success', 2),
		('st-' || NEW.id || '-returned', NEW.id, 'Returned', 'Returned', 'danger', 3),
		('st-' || NEW.id || '-cancelled', NEW.id, 'Cancelled', 'Cancelled', 'neutral', 4);
END;

-- orders.status loses its fixed CHECK, so the table is rebuilt (the procedure 009 follows):
-- every trigger naming orders goes first and comes back verbatim at the end.
DROP TRIGGER order_items_totals_insert;
DROP TRIGGER order_items_totals_update;
DROP TRIGGER order_items_totals_delete;
DROP TRIGGER order_categories_count_insert;
DROP TRIGGER order_categories_count_delete;
DROP TRIGGER orders_search_text_insert;
DROP TRIGGER orders_search_text_note_update;

CREATE TABLE orders_new (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vendor_id TEXT NOT NULL REFERENCES vendors(id),
	date INTEGER NOT NULL,
	status TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('Expense','Gift','Sold','Work','Other')),
	shipping REAL NOT NULL DEFAULT 0,
	discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
	note TEXT NOT NULL DEFAULT '',
	reference TEXT NOT NULL DEFAULT '',
	refunded INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	item_count INTEGER NOT NULL DEFAULT 0,
	paid REAL NOT NULL DEFAULT 0,
	retail REAL NOT NULL DEFAULT 0,
	search_text TEXT NOT NULL DEFAULT '',
	category_count INTEGER NOT NULL DEFAULT 0,
	subtotal REAL GENERATED ALWAYS AS (paid) STORED,
	total REAL GENERATED ALWAYS AS (paid + shipping - discount) STORED,
	saved REAL GENERATED ALWAYS AS (retail - paid + discount) STORED,
	saved_percent REAL GENERATED ALWAYS AS
		(CASE WHEN retail > 0 THEN (retail - paid + discount) / retail * 100 ELSE 0 END) STORED
);

INSERT INTO orders_new
	(rowid, id, user_id, vendor_id, date, status, kind, shipping, discount, note, reference, refunded,
	 created_at, item_count, paid, retail, search_text, category_count)
SELECT
	rowid, id, user_id, vendor_id, date, status, kind, shipping, discount, note, reference, refunded,
	created_at, item_count, paid, retail, search_text, category_count
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE INDEX idx_orders_user_date ON orders(user_id, date, id);
CREATE INDEX idx_orders_user_total ON orders(user_id, total, id);
CREATE INDEX idx_orders_user_kind ON orders(user_id, kind);
CREATE INDEX idx_orders_user_discount ON orders(user_id, discount, id);
CREATE INDEX idx_orders_user_vendor ON orders(user_id, vendor_id, date, id);
CREATE INDEX idx_orders_user_status ON orders(user_id, status, date, id);
CREATE INDEX idx_orders_user_uncategorised ON orders(user_id, date, id, total, saved)
	WHERE category_count = 0;

CREATE TRIGGER order_categories_count_insert AFTER INSERT ON order_categories
BEGIN
	UPDATE orders SET category_count = (SELECT COUNT(*) FROM order_categories WHERE order_id = NEW.order_id)
	WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_categories_count_delete AFTER DELETE ON order_categories
BEGIN
	UPDATE orders SET category_count = (SELECT COUNT(*) FROM order_categories WHERE order_id = OLD.order_id)
	WHERE id = OLD.order_id;
END;

CREATE TRIGGER orders_search_text_insert AFTER INSERT ON orders
BEGIN
	UPDATE orders SET search_text = NEW.note || char(10) WHERE id = NEW.id;
END;

CREATE TRIGGER orders_search_text_note_update AFTER UPDATE OF note ON orders
WHEN NEW.note <> OLD.note
BEGIN
	UPDATE orders SET search_text = NEW.note || char(10) ||
		COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = NEW.id), '')
	WHERE id = NEW.id;
END;

CREATE TRIGGER order_items_totals_insert AFTER INSERT ON order_items
BEGIN
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0)
			FROM order_items WHERE order_id = NEW.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = NEW.order_id), '')
	WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_items_totals_update AFTER UPDATE ON order_items
BEGIN
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0)
			FROM order_items WHERE order_id = OLD.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = OLD.order_id), '')
	WHERE id = OLD.order_id;
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0)
			FROM order_items WHERE order_id = NEW.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = NEW.order_id), '')
	WHERE id = NEW.order_id AND NEW.order_id <> OLD.order_id;
END;

CREATE TRIGGER order_items_totals_delete AFTER DELETE ON order_items
BEGIN
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0)
			FROM order_items WHERE order_id = OLD.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = OLD.order_id), '')
	WHERE id = OLD.order_id;
END;
