-- The statistics count Returned as money back and leave Cancelled out, so both are known to the
-- app by type, and a typed status cannot be deleted.
UPDATE statuses SET type = lower(key) WHERE key IN ('Returned', 'Cancelled') AND type = 'custom';

DROP TRIGGER users_statuses_seed;
CREATE TRIGGER users_statuses_seed AFTER INSERT ON users
BEGIN
	INSERT INTO statuses (id, user_id, key, name, tone, position, own_date, type) VALUES
		('st-' || NEW.id || '-draft', NEW.id, 'Draft', 'Draft', 'neutral', 0, 0, 'draft'),
		('st-' || NEW.id || '-ordered', NEW.id, 'Ordered', 'Ordered', 'progress', 1, 0, 'ordered'),
		('st-' || NEW.id || '-delivered', NEW.id, 'Delivered', 'Delivered', 'success', 2, 1, 'delivered'),
		('st-' || NEW.id || '-returned', NEW.id, 'Returned', 'Returned', 'danger', 3, 1, 'returned'),
		('st-' || NEW.id || '-cancelled', NEW.id, 'Cancelled', 'Cancelled', 'neutral', 4, 0, 'cancelled');
END;
