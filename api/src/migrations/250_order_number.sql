-- An order's own number in its account, counted from 1 in the order the orders were made: what an
-- invoice made from an order without a Reference is numbered by. A number is never reused or changed.
ALTER TABLE orders ADD COLUMN number INTEGER;

UPDATE orders SET number = counted.n
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, date, id) AS n FROM orders) AS counted
WHERE counted.id = orders.id;

-- the account's last number, so a new order's needs no index on orders that every account read would plan through
ALTER TABLE users ADD COLUMN order_number_last INTEGER NOT NULL DEFAULT 0;

UPDATE users SET order_number_last = counted.last
FROM (SELECT user_id, MAX(number) AS last FROM orders GROUP BY user_id) AS counted
WHERE counted.user_id = users.id;

-- every way an order is made gets the next number, so no insert has to ask for one
CREATE TRIGGER orders_number_insert AFTER INSERT ON orders
WHEN NEW.number IS NULL
BEGIN
	UPDATE users SET order_number_last = order_number_last + 1 WHERE id = NEW.user_id;
	UPDATE orders SET number = (SELECT order_number_last FROM users WHERE id = NEW.user_id) WHERE rowid = NEW.rowid;
END;
