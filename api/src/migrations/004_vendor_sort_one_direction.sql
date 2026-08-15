-- Vendor on the orders list groups rather than ranks, and reversed grouping is the same
-- clusters in an order nobody asks for, so 'vendor-desc' came back out of the option list.
-- A database that stored it while it existed maps to the direction that stays.
UPDATE settings SET sort = 'vendor-asc' WHERE sort = 'vendor-desc';
