-- Groceries finds its photos at Bilka: every photo found at REMA 1000 is removed, from the lines it was
-- put on and from the shared library. A line photo carries its library photo's fingerprint.
DELETE FROM order_attachments WHERE order_item_id IS NOT NULL AND sha256 IN
	(SELECT sha256_hex(image) FROM found_photos WHERE source_url LIKE 'https://shop.rema1000.dk/%');
DELETE FROM found_photos WHERE source_url LIKE 'https://shop.rema1000.dk/%';
