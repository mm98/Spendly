-- The monthly summary on Home (8b): the lines the reader hid from one month's summary, so they
-- stay hidden on every device until the next month's summary arrives.
CREATE TABLE monthly_summary_hidden (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	month TEXT NOT NULL,
	category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, month, category_id)
);
