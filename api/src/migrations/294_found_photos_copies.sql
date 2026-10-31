-- The finished WebP copies a line is given (Images and files 17a), made once per product. NULL until
-- the photo is first put on a line.
ALTER TABLE found_photos ADD COLUMN wide BLOB;
ALTER TABLE found_photos ADD COLUMN square BLOB;
