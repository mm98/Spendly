-- A number every change to an order raises, so a save made from an older copy of it is noticed
-- (6d, "This order changed in another tab") rather than written over what another tab saved.
-- Raised by triggers, so every writer counts: the edit form, bulk changes, a vendor merge.
ALTER TABLE orders ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

CREATE TRIGGER orders_revision_update AFTER UPDATE OF vendor_id, date, status, kind, shipping, discount, note, reference, refunded ON orders
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = NEW.id;
END;

CREATE TRIGGER order_items_revision_insert AFTER INSERT ON order_items
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_items_revision_update AFTER UPDATE OF position, title, quantity, price, retail, note ON order_items
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_items_revision_delete AFTER DELETE ON order_items
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = OLD.order_id;
END;

CREATE TRIGGER order_categories_revision_insert AFTER INSERT ON order_categories
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = NEW.order_id;
END;

CREATE TRIGGER order_categories_revision_delete AFTER DELETE ON order_categories
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = OLD.order_id;
END;
