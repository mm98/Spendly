-- Ask no longer looks up offers: a saved answer loses its offer place marks, and the kept offers go.
WITH RECURSIVE stripped(id, answer) AS (
	SELECT id, answer FROM user_ask_chat_turns WHERE answer LIKE '%{{offers:%'
	UNION ALL
	SELECT id, replace(answer, substr(answer, instr(answer, '{{offers:'), instr(substr(answer, instr(answer, '{{offers:')), '}}') + 1), '')
	FROM stripped WHERE instr(answer, '{{offers:') > 0 AND instr(substr(answer, instr(answer, '{{offers:')), '}}') > 0
)
UPDATE user_ask_chat_turns
SET answer = (SELECT s.answer FROM stripped s WHERE s.id = user_ask_chat_turns.id ORDER BY length(s.answer) LIMIT 1)
WHERE answer LIKE '%{{offers:%';

DROP INDEX IF EXISTS user_ask_offers_chat;
DROP TABLE IF EXISTS user_ask_offers;
