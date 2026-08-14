-- Uploaded images are resized on the way in (see lib/images.js: 1600px display, 200px
-- thumbnail) rather than stored at whatever resolution a phone camera produced. The thumbnail
-- is its own small BLOB, served from its own endpoint, so a list of attachments never has to
-- pull the (still much larger) display image just to draw an icon-sized preview.

ALTER TABLE attachments ADD COLUMN thumbnail BLOB;
ALTER TABLE attachments ADD COLUMN thumbnail_content_type TEXT;

ALTER TABLE scan_uploads ADD COLUMN thumbnail BLOB;
ALTER TABLE scan_uploads ADD COLUMN thumbnail_content_type TEXT;
