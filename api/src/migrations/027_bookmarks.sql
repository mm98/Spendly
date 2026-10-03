-- The product calls these bookmarks, so the schema does too. A rename keeps every row, and SQLite
-- rewrites the foreign key that names the renamed table.
ALTER TABLE wishes RENAME TO bookmarks;
ALTER TABLE wish_categories RENAME TO bookmark_categories;
ALTER TABLE bookmark_categories RENAME COLUMN wish_id TO bookmark_id;
