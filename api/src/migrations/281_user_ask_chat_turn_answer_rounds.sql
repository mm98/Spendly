-- How many times Claude was asked for the answer: one, and one more after each round of reading or making.
-- NULL on a turn that is not answered, and on one answered before it was kept.
ALTER TABLE user_ask_chat_turns ADD COLUMN answer_rounds INTEGER;
