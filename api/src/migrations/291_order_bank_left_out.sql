-- Bank payments the reader says are not orders, for the orders' bank check. Kept apart from
-- budget_bank_links, since a payment left out of the orders can still be a budget row. The
-- pattern is the payment's text without digits ("always"), or "once" with its day and amount.
CREATE TABLE order_bank_left_out (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	pattern TEXT NOT NULL,
	PRIMARY KEY (user_id, pattern)
) WITHOUT ROWID;
