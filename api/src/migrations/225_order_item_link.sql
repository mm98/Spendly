-- The page a line was bought on. Optional, and stored as normalise-d by the API.
ALTER TABLE order_items ADD COLUMN url TEXT;
