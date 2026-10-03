-- The last order number each account handed out, for an order saved without a reference of its
-- own (8a: a copy is given a new one). A number is never handed out twice, even after a delete.
CREATE TABLE order_reference_counters (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	last INTEGER NOT NULL
);
