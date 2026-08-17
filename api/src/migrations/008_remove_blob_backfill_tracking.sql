-- Drops what migrations/006 and 007 added: data_checked/thumbnail_checked on attachments and
-- scan_uploads, and settings.blob_backfill_done. Those existed to support a one-time backfill
-- button (routes/account.js POST /compress-blobs, removed with this migration along with the
-- Settings card for it) for accounts with attachments predating compression -- on a
-- single-account deployment with no other login that could ever need it, the catch-up it was
-- for is finished for good, and the tracking columns have nothing left to track.
--
-- data_is_compressed/thumbnail_is_compressed (migrations/005) are untouched: those say how to
-- read a blob back, forever, regardless of whether any backfill ever ran.
ALTER TABLE attachments DROP COLUMN data_checked;
ALTER TABLE attachments DROP COLUMN thumbnail_checked;
ALTER TABLE scan_uploads DROP COLUMN data_checked;
ALTER TABLE scan_uploads DROP COLUMN thumbnail_checked;
ALTER TABLE settings DROP COLUMN blob_backfill_done;
