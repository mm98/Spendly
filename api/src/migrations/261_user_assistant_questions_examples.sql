-- The three example questions on Ask Spendly are saved questions every account starts with. An
-- account that exists gets them once, skipping a wording it saved already, and never past the 8.
INSERT INTO user_assistant_questions (id, user_id, question)
SELECT 'aq-' || lower(hex(randomblob(8))), u.id, 'How much did I spend on food in August?' FROM users u
WHERE (SELECT COUNT(*) FROM user_assistant_questions q WHERE q.user_id = u.id) < 8
	AND NOT EXISTS (SELECT 1 FROM user_assistant_questions q WHERE q.user_id = u.id AND q.question = 'How much did I spend on food in August?');
INSERT INTO user_assistant_questions (id, user_id, question)
SELECT 'aq-' || lower(hex(randomblob(8))), u.id, 'Which shop did I use most this year?' FROM users u
WHERE (SELECT COUNT(*) FROM user_assistant_questions q WHERE q.user_id = u.id) < 8
	AND NOT EXISTS (SELECT 1 FROM user_assistant_questions q WHERE q.user_id = u.id AND q.question = 'Which shop did I use most this year?');
INSERT INTO user_assistant_questions (id, user_id, question)
SELECT 'aq-' || lower(hex(randomblob(8))), u.id, 'Am I over budget on transport?' FROM users u
WHERE (SELECT COUNT(*) FROM user_assistant_questions q WHERE q.user_id = u.id) < 8
	AND NOT EXISTS (SELECT 1 FROM user_assistant_questions q WHERE q.user_id = u.id AND q.question = 'Am I over budget on transport?');

-- in this order: the list reads oldest first, and rowid breaks the tie of one second
CREATE TRIGGER users_assistant_questions_seed AFTER INSERT ON users
BEGIN
	INSERT INTO user_assistant_questions (id, user_id, question) VALUES
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'How much did I spend on food in August?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Which shop did I use most this year?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Am I over budget on transport?');
END;
