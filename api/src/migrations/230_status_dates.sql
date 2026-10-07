-- A status can carry a date of its own (Settings, Statuses): the log may hold any status, not
-- only the three it started with. SQLite cannot drop a CHECK, so the table is made again.
CREATE TABLE order_statuses_new (
	id TEXT PRIMARY KEY,
	order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	status TEXT NOT NULL,
	date INTEGER NOT NULL
);
INSERT INTO order_statuses_new (id, order_id, status, date) SELECT id, order_id, status, date FROM order_statuses;
DROP TABLE order_statuses;
ALTER TABLE order_statuses_new RENAME TO order_statuses;
CREATE INDEX idx_order_statuses_order ON order_statuses(order_id);

-- 1 where the status is dated on its own, 0 where it follows the order's date
ALTER TABLE statuses ADD COLUMN own_date INTEGER NOT NULL DEFAULT 0 CHECK (own_date IN (0, 1));
UPDATE statuses SET own_date = 1 WHERE key IN ('Delivered', 'Returned');

-- a new account starts with Delivered and Returned dated on their own, as the rest of Settings' defaults
DROP TRIGGER users_statuses_seed;
CREATE TRIGGER users_statuses_seed AFTER INSERT ON users
BEGIN
	INSERT INTO statuses (id, user_id, key, name, tone, position, own_date) VALUES
		('st-' || NEW.id || '-draft', NEW.id, 'Draft', 'Draft', 'neutral', 0, 0),
		('st-' || NEW.id || '-ordered', NEW.id, 'Ordered', 'Ordered', 'progress', 1, 0),
		('st-' || NEW.id || '-delivered', NEW.id, 'Delivered', 'Delivered', 'success', 2, 1),
		('st-' || NEW.id || '-returned', NEW.id, 'Returned', 'Returned', 'danger', 3, 1),
		('st-' || NEW.id || '-cancelled', NEW.id, 'Cancelled', 'Cancelled', 'neutral', 4, 0);
END;
