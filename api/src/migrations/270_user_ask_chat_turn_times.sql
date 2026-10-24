-- When each question was asked and its answer arrived, in epoch seconds, shown under every message on Ask.
-- A turn from before these columns has neither, and shows no time.
ALTER TABLE user_ask_chat_turns ADD COLUMN asked_at INTEGER;
ALTER TABLE user_ask_chat_turns ADD COLUMN answered_at INTEGER;
