-- "Make a spreadsheet of my orders this month" takes the place of "Am I over budget on transport?"
-- among the three questions a new account starts with. An account that exists gets it once, skipping
-- a wording it saved already, and never past the 8.
INSERT INTO user_assistant_questions (id, user_id, question)
SELECT 'aq-' || lower(hex(randomblob(8))), u.id, 'Make a spreadsheet of my orders this month' FROM users u
WHERE (SELECT COUNT(*) FROM user_assistant_questions q WHERE q.user_id = u.id) < 8
	AND NOT EXISTS (SELECT 1 FROM user_assistant_questions q WHERE q.user_id = u.id AND q.question = 'Make a spreadsheet of my orders this month');

DROP TRIGGER users_assistant_questions_seed;
-- in this order: the list reads oldest first, and rowid breaks the tie of one second
CREATE TRIGGER users_assistant_questions_seed AFTER INSERT ON users
BEGIN
	INSERT INTO user_assistant_questions (id, user_id, question) VALUES
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'How much did I spend on food in August?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Which shop did I use most this year?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Make a spreadsheet of my orders this month');
END;
