-- The first thing `npm run queries:check` found, and it is a defect the change that added this
-- index shipped.
--
-- 011 created idx_orders_user_uncategorised as (user_id, total, saved) WHERE category_count = 0,
-- for the two readers that sum the uncategorised remainder (the rollup behind
-- GET /categories/uncategorised, and the palette's has-any probe). It also made the orders
-- list's "Without category" filter *worse*: the filter's rows are exactly this index's rows, so
-- the planner drives the page through it and then has nothing to give the ORDER BY, and sorts
-- every uncategorised order the account has in a temp B-tree. On an account with 10,000 of them
-- that is 6.33ms a page against 0.287ms through idx_orders_user_date, which is what the list
-- used before 011 existed.
--
-- It measured clean at the time because the demo account it was measured on has no
-- uncategorised orders at all: an empty partial index answers instantly whatever its columns
-- are, and a sort of nothing is free. The plan check does not have that blind spot -- a temp
-- B-tree on a big table is a finding whether or not today's data makes it cost anything.
--
-- Carrying the list's sort in front of the summed columns serves both: the page is an index
-- walk that stops at LIMIT (0.034ms, 186x), and the rollup still reads total and saved out of
-- the index without touching the table (0.89ms against 0.77ms -- the same plan, two more
-- columns per entry). Same rows, verified against the old index at the same offset.
DROP INDEX idx_orders_user_uncategorised;
CREATE INDEX idx_orders_user_uncategorised ON orders(user_id, date, id, total, saved)
	WHERE category_count = 0;
