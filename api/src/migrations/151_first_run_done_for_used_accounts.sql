-- The first run (/welcome) is for an empty account. An account that already holds an order or a
-- category has been set up, whatever its flag says, so it is not sent there.
UPDATE users SET needs_setup = 0
WHERE needs_setup = 1
	AND (EXISTS (SELECT 1 FROM orders o WHERE o.user_id = users.id)
		OR EXISTS (SELECT 1 FROM categories c WHERE c.user_id = users.id));
