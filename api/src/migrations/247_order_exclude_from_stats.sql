-- An order the reader leaves out of statistics: still listed, searched, filtered and exported,
-- but no spend figure, chart, breakdown or limit counts it.
ALTER TABLE orders ADD COLUMN exclude_from_stats INTEGER NOT NULL DEFAULT 0;

-- the left-out orders are few, so a count in a period and the amount filter's scale read them here
CREATE INDEX idx_orders_user_excluded ON orders(user_id, date, total) WHERE exclude_from_stats = 1;

-- changing the flag is a change to the order, like any other field
DROP TRIGGER orders_revision_update;
CREATE TRIGGER orders_revision_update AFTER UPDATE OF vendor_id, date, status, kind, shipping, discount, note, reference, refunded, exclude_from_stats ON orders
BEGIN
	UPDATE orders SET revision = revision + 1 WHERE id = NEW.id;
END;
