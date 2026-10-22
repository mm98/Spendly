-- A chat on Ask (24a, 24f), kept for the account for 30 days after its last question, then the sweep
-- removes it with its turns and charts. A deleted chat keeps its row until Undo is over.
CREATE TABLE user_assistant_chats (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	-- a few words Spendly writes once the first answer is in; NULL until then, and Chats shows the first question
	heading TEXT,
	first_question TEXT NOT NULL,
	question_count INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	asked_at INTEGER NOT NULL,
	-- the last day it is kept, YYYY-MM-DD in the reader's own calendar
	kept_until TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	deleted_at INTEGER
);
CREATE INDEX user_assistant_chats_user ON user_assistant_chats (user_id, asked_at);
CREATE INDEX user_assistant_chats_expiry ON user_assistant_chats (expires_at);
-- the sweep reads it every minute; only a deleted chat waiting for Undo to end is in it
CREATE INDEX user_assistant_chats_deleted ON user_assistant_chats (deleted_at) WHERE deleted_at IS NOT NULL;

-- One question of a chat and how it ended: answered with its answer, failed, or stopped. A question
-- being answered is 'working' until it ends; answers name their files and charts by place marks.
CREATE TABLE user_assistant_chat_turns (
	id INTEGER PRIMARY KEY,
	chat_id TEXT NOT NULL REFERENCES user_assistant_chats(id) ON DELETE CASCADE,
	question TEXT NOT NULL,
	answer TEXT,
	state TEXT NOT NULL CHECK (state IN ('working', 'answered', 'failed', 'stopped')),
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX user_assistant_chat_turns_chat ON user_assistant_chat_turns (chat_id, id);

-- the chat that made a file or drew a chart; NULL for one made before chats were kept
ALTER TABLE user_assistant_files ADD COLUMN chat_id TEXT REFERENCES user_assistant_chats(id) ON DELETE SET NULL;
CREATE INDEX user_assistant_files_chat ON user_assistant_files (chat_id) WHERE chat_id IS NOT NULL;
ALTER TABLE user_assistant_charts ADD COLUMN chat_id TEXT REFERENCES user_assistant_chats(id) ON DELETE CASCADE;
CREATE INDEX user_assistant_charts_chat ON user_assistant_charts (chat_id) WHERE chat_id IS NOT NULL;
