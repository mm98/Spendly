-- What a status is to the app, apart from what it is called: code that needs "the ordered
-- status" asks for the type. The five every account starts with are typed; any the account
-- adds is custom, and only a custom one can be deleted.
ALTER TABLE statuses ADD COLUMN type TEXT NOT NULL DEFAULT 'custom'
	CHECK (type IN ('draft', 'ordered', 'delivered', 'returned', 'cancelled', 'custom'));
UPDATE statuses SET type = lower(key) WHERE key IN ('Draft', 'Ordered', 'Delivered', 'Returned', 'Cancelled');

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
