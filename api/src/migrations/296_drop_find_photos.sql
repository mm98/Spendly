-- Find photos is removed: its photo library and the vendor's finder setting go with it.
DROP TABLE found_photos;
ALTER TABLE vendors DROP COLUMN photo_finder;
