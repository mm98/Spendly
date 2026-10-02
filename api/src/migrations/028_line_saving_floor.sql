-- A line bought above its retail price saves 0, never a negative amount, so the order's saving
-- is the sum of its lines' savings: each line's retail counts as at least its own price.
DROP TRIGGER order_items_totals_insert;
DROP TRIGGER order_items_totals_update;
DROP TRIGGER order_items_totals_delete;

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

-- Only orders holding such a line change.
UPDATE orders SET retail = (
	SELECT COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0) FROM order_items WHERE order_id = orders.id
)
WHERE id IN (SELECT order_id FROM order_items WHERE retail < price);
