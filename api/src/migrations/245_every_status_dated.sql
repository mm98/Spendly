-- Every status has a date: Ordered is the order's own date, every other status is dated on its own.
UPDATE statuses SET own_date = CASE WHEN type = 'ordered' THEN 0 ELSE 1 END;

DROP TRIGGER users_statuses_seed;
CREATE TRIGGER users_statuses_seed AFTER INSERT ON users
BEGIN
	INSERT INTO statuses (id, user_id, key, name, tone, position, own_date, type) VALUES
		('st-' || NEW.id || '-draft', NEW.id, 'Draft', 'Draft', 'neutral', 0, 1, 'draft'),
		('st-' || NEW.id || '-ordered', NEW.id, 'Ordered', 'Ordered', 'progress', 1, 0, 'ordered'),
		('st-' || NEW.id || '-delivered', NEW.id, 'Delivered', 'Delivered', 'success', 2, 1, 'delivered'),
		('st-' || NEW.id || '-returned', NEW.id, 'Returned', 'Returned', 'danger', 3, 1, 'returned'),
		('st-' || NEW.id || '-cancelled', NEW.id, 'Cancelled', 'Cancelled', 'neutral', 4, 1, 'cancelled');
END;
