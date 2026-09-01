-- A wish keeps one picture. The full-size copy was written on every upload and read by nothing:
-- the list row and the wish's own page both draw the thumbnail, and no page opens a wish picture.
ALTER TABLE wishes DROP COLUMN photo_data;
ALTER TABLE wishes DROP COLUMN photo_data_is_compressed;
ALTER TABLE wishes DROP COLUMN photo_content_type;
ALTER TABLE wishes DROP COLUMN photo_size;
