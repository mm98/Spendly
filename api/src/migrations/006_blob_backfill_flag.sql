-- Whether this account's attachments and scan uploads have been run through POST
-- /compress-blobs (or the standalone script) at least once. Every new write already compresses
-- itself on the way in (lib/images.js), so once an account's legacy rows are caught up nothing
-- can leave it behind again -- this is a one-time completion flag, never something that goes
-- stale and needs re-checking.
--
-- Existing accounts default to 0: they may have rows written before compression existed, so
-- Settings offers the button. seedAccountDefaults inserts 1 for a brand-new account, which never
-- has anything to catch up.
ALTER TABLE settings ADD COLUMN blob_backfill_done INTEGER NOT NULL DEFAULT 0;
