-- This week's offers Ask showed in an answer, as they were then: kept and removed with the chat.
CREATE TABLE user_ask_offers (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	chat_id TEXT NOT NULL REFERENCES user_ask_chats(id) ON DELETE CASCADE,
	offers TEXT NOT NULL
);
CREATE INDEX user_ask_offers_chat ON user_ask_offers (chat_id);
