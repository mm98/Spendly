-- A picture filed on an order itself (a receipt, a scanned page) keeps a full-size copy beside
-- its display copy, for Download: the uploaded picture with its tracking metadata removed. A
-- line's photo keeps only the copies it is drawn with.
ALTER TABLE attachments ADD COLUMN original BLOB;
ALTER TABLE attachments ADD COLUMN original_is_compressed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN original_content_type TEXT;
ALTER TABLE scan_uploads ADD COLUMN original BLOB;
ALTER TABLE scan_uploads ADD COLUMN original_is_compressed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN original_content_type TEXT;
ALTER TABLE order_trash_files ADD COLUMN original BLOB;
