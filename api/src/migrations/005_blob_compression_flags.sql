-- Whether data/thumbnail on this row are stored as a deflated stream (lib/blobCompression.js)
-- or as the original bytes untouched. An attachment's bytes can be anything a browser will
-- upload under kind='image' or 'pdf' -- including a file sharp can't decode as an image at all,
-- which is stored exactly as received -- so there is no byte pattern in the blob itself that
-- reliably means "this one happens to be compressed" without an occasional false match on real
-- content. An explicit flag, set by whichever write actually compressed the blob, is the only
-- safe way to remember which one a row holds.
ALTER TABLE attachments ADD COLUMN data_compressed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN thumbnail_compressed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN data_compressed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scan_uploads ADD COLUMN thumbnail_compressed INTEGER NOT NULL DEFAULT 0;
