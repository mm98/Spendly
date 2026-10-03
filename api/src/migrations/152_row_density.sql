-- How tightly the lists draw their rows: 'comfortable' or 'compact' (Settings, Appearance).
ALTER TABLE settings ADD COLUMN density TEXT NOT NULL DEFAULT 'comfortable';
