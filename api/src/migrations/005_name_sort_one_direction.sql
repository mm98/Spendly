-- Name is the other alphabetical column: it orders a list for finding a record, and reversed
-- alphabet finds nothing sooner, so 'name-desc' came out of the vendors and categories lists
-- the same way 004 took 'vendor-desc' out of orders. A database that stored it maps to the
-- direction that stays.
UPDATE settings SET list_sort = 'name-asc' WHERE list_sort = 'name-desc';
