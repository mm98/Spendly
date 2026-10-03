-- Saved order views (Order list 2g, Navigation shell 9e): a name for the order list's address
-- (its filters, search, sort and view mode), in the account's own order. A date preset is kept as
-- its period ("period=quarter") so the view rolls with the calendar; only a custom range holds dates.
CREATE TABLE saved_views (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	query TEXT NOT NULL,
	position INTEGER NOT NULL,
	is_default INTEGER NOT NULL DEFAULT 0,
	attention INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_saved_views_user ON saved_views(user_id, position);

-- the two every account starts with: ordinary views a reader can rebuild from the facets
INSERT INTO saved_views (id, user_id, name, query, position, attention)
SELECT 'sv-' || id || '-awaiting', id, 'Awaiting delivery', 'status=Ordered', 0, 0 FROM users;
INSERT INTO saved_views (id, user_id, name, query, position, attention)
SELECT 'sv-' || id || '-receipt', id, 'Missing receipt', 'receipt=missing', 1, 1 FROM users;

CREATE TRIGGER users_saved_views_seed AFTER INSERT ON users
BEGIN
	INSERT INTO saved_views (id, user_id, name, query, position, attention) VALUES
		('sv-' || NEW.id || '-awaiting', NEW.id, 'Awaiting delivery', 'status=Ordered', 0, 0),
		('sv-' || NEW.id || '-receipt', NEW.id, 'Missing receipt', 'receipt=missing', 1, 1);
END;

-- how many views the sidebar lists before the rest fold under "N more in Orders" (Settings 11a)
CREATE TABLE saved_view_prefs (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	shown INTEGER NOT NULL
);
