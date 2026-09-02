-- When a pending upload's row may be swept -- stored once at upload time, same shape as
-- sessions.expires_at (migrations/001_init.sql), instead of recomputed from created_at on every
-- sweep. That is what lets attach (routes/scan.js) stop deleting the row when a draft becomes an
-- order: the row just lives until expires_at regardless of what happens to that order afterwards,
-- so the sha256 hash and cached ai_read_json keep answering a later re-upload of the same bytes
-- even after the order it first produced is deleted.
ALTER TABLE scan_uploads ADD COLUMN expires_at INTEGER;
UPDATE scan_uploads SET expires_at = created_at + 7 * 24 * 60 * 60 WHERE expires_at IS NULL;
