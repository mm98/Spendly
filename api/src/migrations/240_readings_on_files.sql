-- A receipt's reading lives on its file: on the scan while it lasts, then on the order's own file.
ALTER TABLE scan_uploads ADD COLUMN read_at INTEGER;
ALTER TABLE attachments ADD COLUMN read_json TEXT;
ALTER TABLE attachments ADD COLUMN read_at INTEGER;

UPDATE scan_uploads SET read_at = COALESCE(
	(SELECT r.read_at FROM scan_readings r WHERE r.user_id = scan_uploads.user_id AND r.sha256 = scan_uploads.sha256),
	created_at)
WHERE ai_read_json IS NOT NULL;

UPDATE attachments SET (read_json, read_at) = (
	SELECT r.read_json, r.read_at FROM scan_readings r JOIN orders o ON o.user_id = r.user_id
	WHERE o.id = attachments.order_id AND r.sha256 = attachments.sha256)
WHERE order_id IS NOT NULL AND sha256 IS NOT NULL;

DROP TABLE scan_readings;
