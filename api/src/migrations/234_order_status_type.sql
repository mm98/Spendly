-- The type of the status an order has, kept on the order so a total that leaves out cancelled
-- and draft orders asks the row, not the statuses table. Kept by the two triggers below;
-- a status's type never changes and a status with orders cannot be deleted.
ALTER TABLE orders ADD COLUMN status_type TEXT NOT NULL DEFAULT 'custom';
UPDATE orders SET status_type = COALESCE(
	(SELECT s.type FROM statuses s WHERE s.user_id = orders.user_id AND s.key = orders.status), 'custom');

CREATE TRIGGER orders_status_type_insert AFTER INSERT ON orders
BEGIN
	UPDATE orders SET status_type = COALESCE(
		(SELECT s.type FROM statuses s WHERE s.user_id = NEW.user_id AND s.key = NEW.status), 'custom')
	WHERE id = NEW.id;
END;

CREATE TRIGGER orders_status_type_update AFTER UPDATE OF status ON orders
BEGIN
	UPDATE orders SET status_type = COALESCE(
		(SELECT s.type FROM statuses s WHERE s.user_id = NEW.user_id AND s.key = NEW.status), 'custom')
	WHERE id = NEW.id;
END;
