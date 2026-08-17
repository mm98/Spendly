-- Whether data/thumbnail on this row has ever been run through compressBlob at all -- distinct
-- from data_is_compressed/thumbnail_is_compressed (migrations/005), which says what the outcome
-- was. Without this, "evaluated and correctly kept raw" and "never evaluated" were the same
-- state (data_is_compressed = 0 either way), so a backfill sweep had no way to skip a blob it
-- had already looked at -- every run re-deflated it again, forever, to reach the same answer it
-- reached the first time.
--
-- The live write path (routes/orders.js, routes/scan.js) always evaluates both blobs at insert
-- time, so it sets both checked columns unconditionally there. Existing rows default to 0, which
-- is exactly the set a backfill still needs to look at; once looked at, a row's checked columns
-- never go back to 0.
ALTER TABLE attachments ADD COLUMN data_checked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN thumbnail_checked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN data_checked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN thumbnail_checked INTEGER NOT NULL DEFAULT 0;
