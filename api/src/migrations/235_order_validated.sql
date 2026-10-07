-- An order checked line by line against one of its receipts: the day, and the receipt it was checked against.
-- Kept apart from orders so the orders row stays as narrow as it was. Removing the receipt, or the
-- order, removes the row.
CREATE TABLE order_validations (
	attachment_id TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
	order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
	validated_at INTEGER NOT NULL
);
