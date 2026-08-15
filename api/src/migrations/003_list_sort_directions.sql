-- The list-sort setting carries its direction, the way the orders sort always has ('date-desc').
-- It stored a bare column ('name', 'spend', 'saved') whose direction was implicit in the pages --
-- which is how the pages' options came to say "Spend" and mean highest-first. Existing values map
-- to the direction they always meant.
UPDATE settings SET list_sort = CASE list_sort
	WHEN 'name' THEN 'name-asc'
	WHEN 'spend' THEN 'spend-desc'
	WHEN 'saved' THEN 'saved-desc'
	ELSE list_sort END;
