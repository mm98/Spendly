-- A reading the reader left before it finished becomes a Draft order on its own (6e, 3a step 2):
-- `leave_as_draft` is set when they leave, `draft_order_id` once the draft exists, so it is made once.
ALTER TABLE scan_uploads ADD COLUMN leave_as_draft INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN draft_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL;
