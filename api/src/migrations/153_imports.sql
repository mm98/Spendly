-- Each import (Settings 11b): the file it read, the column mapping a spreadsheet was read with
-- (JSON, reused by "Reuse mapping"), what it wrote, and whether it was undone.
CREATE TABLE imports (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	file_name TEXT NOT NULL,
	mapping TEXT,
	orders INTEGER NOT NULL DEFAULT 0,
	lines INTEGER NOT NULL DEFAULT 0,
	skipped INTEGER NOT NULL DEFAULT 0,
	vendors INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	undone_at INTEGER
);
CREATE INDEX idx_imports_user_created ON imports(user_id, created_at);

-- what an import wrote, so undo removes exactly that; cleared when the import is forgotten
ALTER TABLE orders ADD COLUMN import_id TEXT REFERENCES imports(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN import_id TEXT REFERENCES imports(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN import_id TEXT REFERENCES imports(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_import ON orders(import_id) WHERE import_id IS NOT NULL;
CREATE INDEX idx_vendors_import ON vendors(import_id) WHERE import_id IS NOT NULL;
CREATE INDEX idx_categories_import ON categories(import_id) WHERE import_id IS NOT NULL;
