-- A discount belongs to the order, not to a line of it.
--
-- Until now the one way to record a rabat was a line item with a negative price, which made
-- `order_items.price` the single signed money field in the schema. That was the wrong home for
-- it twice over. A discount is not a thing you bought -- it has no quantity, no retail price
-- and no photo to attach -- so every reader of an order's lines had to treat one row as not
-- really a row: item_count counted it, the lines list drew it, and "2 items" over a receipt
-- with one product and one rabat was a count nobody meant. And on a phone it could not even be
-- entered: inputMode="decimal" draws no minus key, so the field accepted a value the keyboard
-- could not type.
--
-- So `discount` joins `shipping` as an order-level amount: both are plain non-negative columns
-- the user types, neither is derived from the items, and the generated columns below fold them
-- into the figures. Nothing about the item triggers changes -- they aggregate order_items into
-- paid/retail exactly as before, and `total`/`saved` pick the new column up on their own,
-- because a STORED generated column is recomputed by SQLite on any write to a row it reads.
--
-- The four generated columns are why this is a table rebuild rather than an ALTER TABLE ADD
-- COLUMN: SQLite cannot change a generated column's expression in place, and `total` and
-- `saved` both have to learn the new term.
--
--   subtotal      = paid                            (unchanged: what the lines cost)
--   total         = paid + shipping - discount      (what left the account)
--   saved         = retail - (paid - discount)      (see below)
--   saved_percent = the same, as a percentage of retail
--
-- `saved` gains the discount deliberately. A rabat is money not spent against what the goods
-- list for, which is exactly what this column means, and the negative-line arrangement it
-- replaces could not say so: a -10,00 line reduced `paid` by 10 and -- because retail falls
-- back to price when a line carries none, COALESCE(retail, price) -- reduced `retail` by 10 as
-- well, so the two moved together and the saving came out unchanged. An order that was
-- discounted at the till reported having saved nothing. Accounts holding such an order will
-- see its saving rise after this runs; that is the correction, not a side effect of it.

-- Every trigger that *references* orders has to go before the table does, not just the two
-- that fire on it. ALTER TABLE ... RENAME reparses the whole schema, and the order_items
-- triggers below name `orders` in their bodies -- so with them still installed, the rename of
-- orders_new fails with "no such table: main.orders" at the instant the old table is gone.
-- (SQLite documents PRAGMA legacy_alter_table for this; dropping and restating them is the
-- same fix without leaving a connection-wide flag switched on behind the migration.)
--
-- They are recreated verbatim at the end of this file. Nothing about them changes: they
-- aggregate order_items into paid/retail/item_count/search_text, none of which discount
-- touches.
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
	status TEXT NOT NULL CHECK (status IN ('Ordered','Delivered','Returned')),
	kind TEXT NOT NULL CHECK (kind IN ('Expense','Gift','Sold','Work','Other')),
	shipping REAL NOT NULL DEFAULT 0,
	-- Non-negative like shipping: the sign is what the column means, not something the user
	-- types. A negative discount is a surcharge, which this app has no concept of, and letting
	-- one in would put the signed-amount problem back exactly where it was just taken from.
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

-- created_at is carried across explicitly: it defaults to unixepoch(), so leaving it out of
-- the column list would silently restamp every order in the account with the migration's own
-- run time.
INSERT INTO orders_new
	(id, user_id, vendor_id, date, status, kind, shipping, note, reference, refunded,
	 created_at, item_count, paid, retail, search_text, category_count)
SELECT
	id, user_id, vendor_id, date, status, kind, shipping, note, reference, refunded,
	created_at, item_count, paid, retail, search_text, category_count
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

-- The indexes go with the dropped table and have to be restated. Same definitions as
-- 001_init.sql, where the reasoning for each one lives.
CREATE INDEX idx_orders_user_date ON orders(user_id, date, id);
CREATE INDEX idx_orders_user_total ON orders(user_id, total, id);
CREATE INDEX idx_orders_user_vendor ON orders(user_id, vendor_id);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_user_kind ON orders(user_id, kind);

-- And so do all seven triggers dropped at the top, restated exactly as 001_init.sql has them.
CREATE TRIGGER order_items_totals_insert AFTER INSERT ON order_items
BEGIN
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
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
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
			FROM order_items WHERE order_id = OLD.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = OLD.order_id), '')
	WHERE id = OLD.order_id;
	UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
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
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0), COALESCE(SUM(COALESCE(retail, price) * quantity), 0)
			FROM order_items WHERE order_id = OLD.order_id
		),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = OLD.order_id), '')
	WHERE id = OLD.order_id;
END;

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

-- Now move the discounts that are already in the ledger as negative lines.
--
-- Guarded to orders that keep at least one ordinary line, because an order whose every item is
-- a discount would be left with none at all, and "an order needs at least one item" is a rule
-- the API enforces on every write (lib/validate.js). Such a row is nonsense data either way;
-- leaving it exactly as it is means a human can still see what it was, where converting it
-- would produce a record no door in the app could have created. The same predicate guards both
-- statements, so the sum written here and the rows removed below are always the same set.
UPDATE orders SET discount = (
	SELECT SUM(-price * quantity) FROM order_items
	WHERE order_id = orders.id AND price < 0
)
WHERE EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND price < 0)
  AND EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND price >= 0);

-- Deleting the lines is also what recalculates the orders they belonged to: the
-- order_items_totals_delete trigger recomputes item_count, paid, retail and search_text from
-- whatever rows remain, and subtotal/total/saved/saved_percent are generated from those. So no
-- figure is restated by hand here, and none can be missed -- the same trigger that has kept
-- these columns true on every ordinary write keeps them true through the migration.
--
-- An attachment hanging off a discount line has to be removed by hand first, and this is the
-- one place the migration cannot lean on the schema. attachments.order_item_id is declared ON
-- DELETE CASCADE, but the runner turns foreign keys off for the duration (see db.js, which
-- must, or the DROP TABLE above cascades away every order_item in the database) -- and a
-- cascade is an enforcement action, so with enforcement off it does not fire. Deleting the
-- lines without this leaves attachments pointing at rows that no longer exist; the
-- foreign_key_check db.js runs afterwards reports exactly that, which is how it was found.
-- Removing them is right on the merits too: a photo of a discount line is a photo of the row
-- being removed.
DELETE FROM attachments WHERE order_item_id IN (
	SELECT id FROM order_items WHERE price < 0 AND EXISTS (
		SELECT 1 FROM order_items other WHERE other.order_id = order_items.order_id AND other.price >= 0
	)
);

DELETE FROM order_items WHERE price < 0 AND EXISTS (
	SELECT 1 FROM order_items other WHERE other.order_id = order_items.order_id AND other.price >= 0
);
