-- What a payment on a bank statement is in the budget, as the reader answered it: the name of a
-- row, or NULL for "not part of the budget". Keyed by the payment's text with its digits taken
-- out, so next month's statement finds it again; by the row's name, since every year has its
-- own rows.
CREATE TABLE bank_links (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	pattern TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
	line_name TEXT,
	PRIMARY KEY (user_id, pattern, kind)
) WITHOUT ROWID;
