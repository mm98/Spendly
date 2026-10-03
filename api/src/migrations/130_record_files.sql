-- The source bytes' hash on a stored file, so the same file on an order can be recognised (17b, 3c).
-- NULL on rows stored before it: their source bytes are gone (images are kept resized).
ALTER TABLE attachments ADD COLUMN sha256 TEXT;
CREATE INDEX idx_attachments_sha256 ON attachments(sha256) WHERE sha256 IS NOT NULL;

-- How many pages a PDF has; NULL until it is known (an image, or a PDF stored before this).
ALTER TABLE attachments ADD COLUMN pages INTEGER;
ALTER TABLE scan_uploads ADD COLUMN pages INTEGER;

-- Each page of a PDF, rendered the first time someone opens it (12b page rail).
CREATE TABLE attachment_pages (
	attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
	page INTEGER NOT NULL,
	image BLOB NOT NULL,
	content_type TEXT NOT NULL,
	PRIMARY KEY (attachment_id, page)
);
CREATE TABLE scan_upload_pages (
	upload_id TEXT NOT NULL REFERENCES scan_uploads(id) ON DELETE CASCADE,
	page INTEGER NOT NULL,
	image BLOB NOT NULL,
	content_type TEXT NOT NULL,
	PRIMARY KEY (upload_id, page)
);

-- A receipt's reading, kept by the file's hash after the upload row itself expires (3c).
CREATE TABLE scan_readings (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	sha256 TEXT NOT NULL,
	read_json TEXT NOT NULL,
	read_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (user_id, sha256)
);
