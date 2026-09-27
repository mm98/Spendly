-- The yearly budget: one sheet per year, groups of rows in it, and per row and month two
-- optional amounts -- what was expected, and what really came. Nothing here is an order.
CREATE TABLE budget_years (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	year INTEGER NOT NULL,
	UNIQUE (user_id, year)
);

CREATE TABLE budget_groups (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	year_id TEXT NOT NULL REFERENCES budget_years(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
	name TEXT NOT NULL,
	position INTEGER NOT NULL
);

CREATE TABLE budget_lines (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	group_id TEXT NOT NULL REFERENCES budget_groups(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	account TEXT NOT NULL DEFAULT '',
	position INTEGER NOT NULL
);

-- NULL is "nothing written", which is a different fact from 0. A month with neither amount
-- has no row at all.
CREATE TABLE budget_amounts (
	line_id TEXT NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
	month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
	expected REAL,
	real REAL,
	PRIMARY KEY (line_id, month)
) WITHOUT ROWID;
