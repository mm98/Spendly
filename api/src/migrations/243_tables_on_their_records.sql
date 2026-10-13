-- A value with one row per record lives on that record; a picture keeps a table of its own, so a
-- list of records never reads one it does not draw.

ALTER TABLE users ADD COLUMN order_reference_last INTEGER;
UPDATE users SET order_reference_last = (SELECT last FROM order_reference_counters c WHERE c.user_id = users.id);
DROP TABLE order_reference_counters;

ALTER TABLE users ADD COLUMN saved_views_shown INTEGER;
UPDATE users SET saved_views_shown = (SELECT shown FROM saved_view_prefs p WHERE p.user_id = users.id);
DROP TABLE saved_view_prefs;

ALTER TABLE orders ADD COLUMN validated_by TEXT REFERENCES attachments(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN validated_at INTEGER;
UPDATE orders SET (validated_by, validated_at) = (SELECT v.attachment_id, v.validated_at FROM order_validations v WHERE v.order_id = orders.id)
WHERE id IN (SELECT order_id FROM order_validations);
DROP TABLE order_validations;

DROP TABLE dashboard_cards;

CREATE TABLE bookmark_photos (
	bookmark_id TEXT PRIMARY KEY REFERENCES bookmarks(id) ON DELETE CASCADE,
	thumbnail BLOB NOT NULL,
	thumbnail_is_compressed INTEGER NOT NULL DEFAULT 0,
	wide BLOB,
	wide_is_compressed INTEGER NOT NULL DEFAULT 0,
	content_type TEXT
);
INSERT INTO bookmark_photos (bookmark_id, thumbnail, thumbnail_is_compressed, wide, wide_is_compressed, content_type)
SELECT id, photo_thumbnail, photo_thumbnail_is_compressed, photo_wide, photo_wide_is_compressed, photo_thumbnail_content_type
FROM bookmarks WHERE photo_thumbnail IS NOT NULL;
UPDATE bookmarks SET photo_id = NULL WHERE photo_thumbnail IS NULL;
ALTER TABLE bookmarks DROP COLUMN photo_thumbnail;
ALTER TABLE bookmarks DROP COLUMN photo_thumbnail_is_compressed;
ALTER TABLE bookmarks DROP COLUMN photo_thumbnail_content_type;
ALTER TABLE bookmarks DROP COLUMN photo_wide;
ALTER TABLE bookmarks DROP COLUMN photo_wide_is_compressed;
