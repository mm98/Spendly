-- A bookmark's picture is kept at the two sizes every picture has: photo_thumbnail is the square,
-- photo_wide the wide copy. A picture stored before this has no wide copy and is drawn from the square.
ALTER TABLE bookmarks ADD COLUMN photo_wide BLOB;
ALTER TABLE bookmarks ADD COLUMN photo_wide_is_compressed INTEGER NOT NULL DEFAULT 0;
