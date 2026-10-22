-- Ask's tables, indexes and trigger take the feature's name, the one the reader sees.
ALTER TABLE user_assistant_days RENAME TO user_ask_days;
ALTER TABLE user_assistant_questions RENAME TO user_ask_questions;
ALTER TABLE user_assistant_chats RENAME TO user_ask_chats;
ALTER TABLE user_assistant_chat_turns RENAME TO user_ask_chat_turns;
ALTER TABLE user_assistant_files RENAME TO user_ask_files;
ALTER TABLE user_assistant_charts RENAME TO user_ask_charts;

DROP INDEX user_assistant_chats_user;
DROP INDEX user_assistant_chats_expiry;
DROP INDEX user_assistant_chats_deleted;
DROP INDEX user_assistant_chat_turns_chat;
DROP INDEX user_assistant_files_user;
DROP INDEX user_assistant_files_expiry;
DROP INDEX user_assistant_files_deleted;
DROP INDEX user_assistant_files_chat;
DROP INDEX user_assistant_charts_expiry;
DROP INDEX user_assistant_charts_chat;
CREATE INDEX user_ask_chats_user ON user_ask_chats (user_id, asked_at);
CREATE INDEX user_ask_chats_expiry ON user_ask_chats (expires_at);
CREATE INDEX user_ask_chats_deleted ON user_ask_chats (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX user_ask_chat_turns_chat ON user_ask_chat_turns (chat_id, id);
CREATE INDEX user_ask_files_user ON user_ask_files (user_id, created_at);
CREATE INDEX user_ask_files_expiry ON user_ask_files (expires_at);
CREATE INDEX user_ask_files_deleted ON user_ask_files (deleted_at) WHERE deleted_at IS NOT NULL AND stored_name IS NOT NULL;
CREATE INDEX user_ask_files_chat ON user_ask_files (chat_id) WHERE chat_id IS NOT NULL;
CREATE INDEX user_ask_charts_expiry ON user_ask_charts (expires_at);
CREATE INDEX user_ask_charts_chat ON user_ask_charts (chat_id) WHERE chat_id IS NOT NULL;

-- a new account starts with three example questions saved
DROP TRIGGER users_assistant_questions_seed;
CREATE TRIGGER users_ask_questions_seed AFTER INSERT ON users
BEGIN
	INSERT INTO user_ask_questions (id, user_id, question) VALUES
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'How much did I spend on food in August?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Which shop did I use most this year?'),
		('aq-' || lower(hex(randomblob(8))), NEW.id, 'Make a spreadsheet of my orders this month');
END;
