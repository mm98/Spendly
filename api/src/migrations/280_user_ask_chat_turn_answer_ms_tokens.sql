-- How long the server took to answer a question, in milliseconds from the question arriving to the answer sent,
-- and the tokens Claude read and wrote for it, cached ones included. NULL on a turn that is not answered, and on
-- one answered before they were kept.
ALTER TABLE user_ask_chat_turns ADD COLUMN answer_ms INTEGER;
ALTER TABLE user_ask_chat_turns ADD COLUMN answer_tokens INTEGER;
