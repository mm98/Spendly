-- How many of the newest orders Home's Recent orders card shows (Settings > Lists).
ALTER TABLE settings ADD COLUMN recent_rows INTEGER NOT NULL DEFAULT 5 CHECK (recent_rows BETWEEN 1 AND 15);
