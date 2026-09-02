-- A log of status events, not one row per status: a returned item can be replaced and the
-- replacement delivered again, so Delivered (and Returned) can genuinely happen more than once
-- over an order's life -- a fixed row-per-status shape (or one nullable column per status on
-- orders itself) cannot hold that without one event overwriting the last. orders.status/
-- orders.date are untouched and still drive every list, sort and filter; this table is purely an
-- added, appendable timeline alongside them, kept in sync by the application
-- (api/src/routes/orders.js).
CREATE TABLE order_statuses (
	id TEXT PRIMARY KEY,
	order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	status TEXT NOT NULL CHECK (status IN ('Ordered','Delivered','Returned')),
	date INTEGER NOT NULL
);
CREATE INDEX idx_order_statuses_order ON order_statuses(order_id);

-- Backfill: the one date every existing order actually has for its current status is when its
-- row was written, not a real status-change date this table did not exist yet to capture.
-- Truncated to the day, matching how every other date in the app carries no time-of-day. The
-- order's own id doubles as this one backfilled row's id -- one row per order here, so it's
-- already unique.
INSERT INTO order_statuses (id, order_id, status, date)
SELECT id, id, status, (created_at / 86400) * 86400 FROM orders;
