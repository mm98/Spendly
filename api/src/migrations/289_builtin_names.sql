-- The names Spendly gives an account (its statuses, its first saved views and its example questions) are
-- shown in the reader's language until the reader renames one. builtin_name holds which built-in name a
-- row shows; it is cleared on a rename, and from then on the row's own text shows in every language.
ALTER TABLE statuses ADD COLUMN builtin_name TEXT;
UPDATE statuses SET builtin_name = type
WHERE (type, name) IN (VALUES ('draft', 'Draft'), ('ordered', 'Ordered'), ('delivered', 'Delivered'), ('returned', 'Returned'), ('cancelled', 'Cancelled'));

ALTER TABLE user_saved_views ADD COLUMN builtin_name TEXT;
UPDATE user_saved_views SET builtin_name = 'awaiting' WHERE id LIKE 'sv-%-awaiting' AND name = 'Awaiting delivery';
UPDATE user_saved_views SET builtin_name = 'receipt' WHERE id LIKE 'sv-%-receipt' AND name = 'Missing receipt';

ALTER TABLE user_ask_questions ADD COLUMN builtin_question TEXT;
UPDATE user_ask_questions SET builtin_question = CASE question
	WHEN 'How much did I spend on food in August?' THEN 'food'
	WHEN 'Which shop did I use most this year?' THEN 'shop'
	WHEN 'Make a spreadsheet of my orders this month' THEN 'spreadsheet'
	WHEN 'Am I over budget on transport?' THEN 'transport'
END;

DROP TRIGGER users_statuses_seed;
CREATE TRIGGER users_statuses_seed AFTER INSERT ON users
BEGIN
	INSERT INTO statuses (id, user_id, key, name, tone, position, own_date, type, builtin_name) VALUES
		('st-' || NEW.id || '-draft', NEW.id, 'Draft', 'Draft', 'neutral', 0, 1, 'draft', 'draft'),
		('st-' || NEW.id || '-ordered', NEW.id, 'Ordered', 'Ordered', 'progress', 1, 0, 'ordered', 'ordered'),
		('st-' || NEW.id || '-delivered', NEW.id, 'Delivered', 'Delivered', 'success', 2, 1, 'delivered', 'delivered'),
		('st-' || NEW.id || '-returned', NEW.id, 'Returned', 'Returned', 'danger', 3, 1, 'returned', 'returned'),
		('st-' || NEW.id || '-cancelled', NEW.id, 'Cancelled', 'Cancelled', 'neutral', 4, 1, 'cancelled', 'cancelled');
END;

DROP TRIGGER users_saved_views_seed;
CREATE TRIGGER users_saved_views_seed AFTER INSERT ON users
BEGIN
	INSERT INTO user_saved_views (id, user_id, name, query, position, attention, builtin_name) VALUES
		('sv-' || NEW.id || '-awaiting', NEW.id, 'Awaiting delivery', 'status=Ordered', 0, 0, 'awaiting'),
		('sv-' || NEW.id || '-receipt', NEW.id, 'Missing receipt', 'receipt=missing', 1, 0, 'receipt');
END;

DROP TRIGGER users_ask_questions_seed;
-- in this order: the list reads oldest first, and rowid breaks the tie of one second
CREATE TRIGGER users_ask_questions_seed AFTER INSERT ON users
BEGIN
	INSERT INTO user_ask_questions (id, user_id, question, builtin_question) VALUES
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'How much did I spend on food in August?', 'food'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Which shop did I use most this year?', 'shop'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Make a spreadsheet of my orders this month', 'spreadsheet');
END;
