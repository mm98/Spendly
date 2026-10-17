-- A line the reader removed from Previous imports (Settings 11b). The list leaves it out; its
-- orders keep their link, so the order list's import chip still finds them.
ALTER TABLE order_imports ADD COLUMN hidden_at INTEGER;

-- An imported order's revision as its import wrote it, so Undo can count the orders changed since
ALTER TABLE orders ADD COLUMN import_revision INTEGER;
