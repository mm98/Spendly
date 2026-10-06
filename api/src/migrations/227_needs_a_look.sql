-- Which rows Home's Needs a look shows (Settings 11a, Needs a look). A rule is kept here only once
-- someone sets it; a rule nobody has set stands at its own default (api/src/lib/looks.js), so a
-- new rule needs no migration.
CREATE TABLE home_attention_rules (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	rule TEXT NOT NULL,
	enabled INTEGER NOT NULL,
	PRIMARY KEY (user_id, rule)
) WITHOUT ROWID;

-- No starting view carries the attention flag: the sidebar's Missing receipt count is a plain count.
UPDATE saved_views SET attention = 0
WHERE attention = 1 AND id LIKE 'sv-%-receipt' AND name = 'Missing receipt' AND query = 'receipt=missing';

DROP TRIGGER users_saved_views_seed;
CREATE TRIGGER users_saved_views_seed AFTER INSERT ON users
BEGIN
	INSERT INTO saved_views (id, user_id, name, query, position, attention) VALUES
		('sv-' || NEW.id || '-awaiting', NEW.id, 'Awaiting delivery', 'status=Ordered', 0, 0),
		('sv-' || NEW.id || '-receipt', NEW.id, 'Missing receipt', 'receipt=missing', 1, 0);
END;
