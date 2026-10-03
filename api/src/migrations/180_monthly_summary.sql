-- The monthly summary on Home (8b): the last month whose summary the reader put away, so it stays
-- away on every device until the next month's arrives.
CREATE TABLE monthly_summary_seen (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	month TEXT NOT NULL
);
