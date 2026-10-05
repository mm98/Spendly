-- A vendor's image keeps only the renditions the pages draw: the uploaded file, with whatever
-- metadata it carried, is not stored.
ALTER TABLE vendor_images DROP COLUMN original;
ALTER TABLE vendor_images DROP COLUMN original_type;
