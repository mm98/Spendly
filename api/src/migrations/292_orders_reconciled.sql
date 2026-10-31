-- The day a bank payment was first matched to the order, or the order was created from one (Order list 2j).
ALTER TABLE orders ADD COLUMN reconciled_at INTEGER;
