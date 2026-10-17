-- The last recipient an account made an invoice for, so the next invoice starts with it. typed = 1 is
-- a recipient written by hand; otherwise it is the company the register found for lookup.
CREATE TABLE user_invoice_recipients (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	typed INTEGER NOT NULL DEFAULT 0,
	lookup TEXT,
	cvr TEXT,
	name TEXT NOT NULL,
	address TEXT,
	country TEXT NOT NULL DEFAULT 'DK',
	att TEXT
);
