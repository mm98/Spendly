-- The remembered recipient holds the dialog's fields as they were last downloaded, every one optional.
-- cvr is for a Danish recipient and looked up in the register; vat_number is for one outside Denmark.
CREATE TABLE user_invoice_recipients_new (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	name TEXT,
	country TEXT NOT NULL DEFAULT 'DK',
	cvr TEXT,
	vat_number TEXT,
	address TEXT,
	att TEXT
);
INSERT INTO user_invoice_recipients_new (user_id, name, country, cvr, address, att)
	SELECT user_id, name, country, cvr, address, att FROM user_invoice_recipients;
DROP TABLE user_invoice_recipients;
ALTER TABLE user_invoice_recipients_new RENAME TO user_invoice_recipients;
