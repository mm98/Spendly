-- What each vendor's orders add up to, kept on the vendor so a list reads it for free: spend and saving in
-- whole øre, so a running sum cannot drift. "Paid" is lib/moneyPaid.js with constants.js's MONEY_BACK_KINDS.
ALTER TABLE vendors ADD COLUMN spend_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN saved_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN last_order_date INTEGER;
UPDATE vendors SET (spend_cents, saved_cents, last_order_date) = (
	SELECT COALESCE(SUM(CASE WHEN orders.status_type NOT IN ('cancelled', 'draft') AND orders.status_type <> 'returned' AND orders.kind NOT IN ('Sold') AND orders.exclude_from_stats = 0 THEN CAST(ROUND(orders.total * 100) AS INTEGER) ELSE 0 END), 0), COALESCE(SUM(CASE WHEN orders.status_type NOT IN ('cancelled', 'draft') AND orders.status_type <> 'returned' AND orders.kind NOT IN ('Sold') AND orders.exclude_from_stats = 0 THEN CAST(ROUND(orders.saved * 100) AS INTEGER) ELSE 0 END), 0), MAX(date)
	FROM orders WHERE user_id = vendors.user_id AND vendor_id = vendors.id);

CREATE TRIGGER orders_vendor_totals_insert AFTER INSERT ON orders
BEGIN
	UPDATE vendors SET spend_cents = spend_cents + CASE WHEN NEW.status_type NOT IN ('cancelled', 'draft') AND NEW.status_type <> 'returned' AND NEW.kind NOT IN ('Sold') AND NEW.exclude_from_stats = 0 THEN CAST(ROUND(NEW.total * 100) AS INTEGER) ELSE 0 END,
		saved_cents = saved_cents + CASE WHEN NEW.status_type NOT IN ('cancelled', 'draft') AND NEW.status_type <> 'returned' AND NEW.kind NOT IN ('Sold') AND NEW.exclude_from_stats = 0 THEN CAST(ROUND(NEW.saved * 100) AS INTEGER) ELSE 0 END,
		last_order_date = (SELECT MAX(date) FROM orders WHERE user_id = NEW.user_id AND vendor_id = NEW.vendor_id)
	WHERE id = NEW.vendor_id;
END;

CREATE TRIGGER orders_vendor_totals_delete AFTER DELETE ON orders
BEGIN
	UPDATE vendors SET spend_cents = spend_cents - CASE WHEN OLD.status_type NOT IN ('cancelled', 'draft') AND OLD.status_type <> 'returned' AND OLD.kind NOT IN ('Sold') AND OLD.exclude_from_stats = 0 THEN CAST(ROUND(OLD.total * 100) AS INTEGER) ELSE 0 END,
		saved_cents = saved_cents - CASE WHEN OLD.status_type NOT IN ('cancelled', 'draft') AND OLD.status_type <> 'returned' AND OLD.kind NOT IN ('Sold') AND OLD.exclude_from_stats = 0 THEN CAST(ROUND(OLD.saved * 100) AS INTEGER) ELSE 0 END,
		last_order_date = (SELECT MAX(date) FROM orders WHERE user_id = OLD.user_id AND vendor_id = OLD.vendor_id)
	WHERE id = OLD.vendor_id;
END;

CREATE TRIGGER orders_vendor_totals_update AFTER UPDATE OF vendor_id, date, paid, retail, shipping, discount, status_type, kind, exclude_from_stats ON orders
BEGIN
	UPDATE vendors SET spend_cents = spend_cents - CASE WHEN OLD.status_type NOT IN ('cancelled', 'draft') AND OLD.status_type <> 'returned' AND OLD.kind NOT IN ('Sold') AND OLD.exclude_from_stats = 0 THEN CAST(ROUND(OLD.total * 100) AS INTEGER) ELSE 0 END,
		saved_cents = saved_cents - CASE WHEN OLD.status_type NOT IN ('cancelled', 'draft') AND OLD.status_type <> 'returned' AND OLD.kind NOT IN ('Sold') AND OLD.exclude_from_stats = 0 THEN CAST(ROUND(OLD.saved * 100) AS INTEGER) ELSE 0 END,
		last_order_date = (SELECT MAX(date) FROM orders WHERE user_id = OLD.user_id AND vendor_id = OLD.vendor_id)
	WHERE id = OLD.vendor_id;
	UPDATE vendors SET spend_cents = spend_cents + CASE WHEN NEW.status_type NOT IN ('cancelled', 'draft') AND NEW.status_type <> 'returned' AND NEW.kind NOT IN ('Sold') AND NEW.exclude_from_stats = 0 THEN CAST(ROUND(NEW.total * 100) AS INTEGER) ELSE 0 END,
		saved_cents = saved_cents + CASE WHEN NEW.status_type NOT IN ('cancelled', 'draft') AND NEW.status_type <> 'returned' AND NEW.kind NOT IN ('Sold') AND NEW.exclude_from_stats = 0 THEN CAST(ROUND(NEW.saved * 100) AS INTEGER) ELSE 0 END,
		last_order_date = (SELECT MAX(date) FROM orders WHERE user_id = NEW.user_id AND vendor_id = NEW.vendor_id)
	WHERE id = NEW.vendor_id;
END;
