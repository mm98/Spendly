-- How many orders carry each category, and how many orders each vendor has, kept on the record so a
-- list reads them for free. Adjusted by one on every link or order write: a count is a whole number,
-- so it cannot drift the way a running sum of money would.
ALTER TABLE categories ADD COLUMN order_count INTEGER NOT NULL DEFAULT 0;
UPDATE categories SET order_count = (SELECT COUNT(*) FROM order_categories WHERE category_id = categories.id);

CREATE TRIGGER order_categories_category_count_insert AFTER INSERT ON order_categories
BEGIN
	UPDATE categories SET order_count = order_count + 1 WHERE id = NEW.category_id;
END;

CREATE TRIGGER order_categories_category_count_delete AFTER DELETE ON order_categories
BEGIN
	UPDATE categories SET order_count = order_count - 1 WHERE id = OLD.category_id;
END;

CREATE TRIGGER order_categories_category_count_update AFTER UPDATE OF category_id ON order_categories
	WHEN NEW.category_id IS NOT OLD.category_id
BEGIN
	UPDATE categories SET order_count = order_count - 1 WHERE id = OLD.category_id;
	UPDATE categories SET order_count = order_count + 1 WHERE id = NEW.category_id;
END;

ALTER TABLE vendors ADD COLUMN order_count INTEGER NOT NULL DEFAULT 0;
UPDATE vendors SET order_count = (SELECT COUNT(*) FROM orders WHERE user_id = vendors.user_id AND vendor_id = vendors.id);

CREATE TRIGGER orders_vendor_count_insert AFTER INSERT ON orders
BEGIN
	UPDATE vendors SET order_count = order_count + 1 WHERE id = NEW.vendor_id;
END;

CREATE TRIGGER orders_vendor_count_delete AFTER DELETE ON orders
BEGIN
	UPDATE vendors SET order_count = order_count - 1 WHERE id = OLD.vendor_id;
END;

CREATE TRIGGER orders_vendor_count_update AFTER UPDATE OF vendor_id ON orders
	WHEN NEW.vendor_id IS NOT OLD.vendor_id
BEGIN
	UPDATE vendors SET order_count = order_count - 1 WHERE id = OLD.vendor_id;
	UPDATE vendors SET order_count = order_count + 1 WHERE id = NEW.vendor_id;
END;
