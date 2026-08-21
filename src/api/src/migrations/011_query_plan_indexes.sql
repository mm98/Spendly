-- Four index changes out of one measured audit of every query in api/src, run against a
-- 50,000-order account (and a 95,000-order ten-user copy). Two widen an existing index in
-- place, one is a partial index over rows that barely exist, one moves a sort into an index --
-- so the set costs roughly what the old set cost to write, and each entry below names the
-- reader it was measured for.

-- (user_id, vendor_id) -> (user_id, vendor_id, date, id): the same (date, id) tail every
-- sibling index carries (001_init.sql), and for the same two readers. The vendor filter
-- combined with the default date sort could not get order from the old index, so a deep page
-- walked the whole account through idx_orders_user_date probing vendor_id per row -- 9.3ms,
-- against 0.11ms covering (84x). And lib/aggregate.js's newest-order-per-vendor probe only
-- measured its documented 0.3ms because the planner, having no statistics, happened to walk
-- the date index backwards: a vendor with no orders yet (every vendor right after POST
-- /vendors) forced that walk to the end -- 12.6ms per such vendor per Vendors read -- and
-- with statistics present the old shape re-sorted per vendor at ~24ms. Widened, the probe is
-- a covering two-step at 0.04ms with statistics and without.
DROP INDEX idx_orders_user_vendor;
CREATE INDEX idx_orders_user_vendor ON orders(user_id, vendor_id, date, id);

-- (user_id, status) -> (user_id, status, date, id): a strict superset for the status filter
-- and countReturnedEver (the prefix is unchanged), and what the returns card actually asks --
-- returned orders in a window, newest first -- becomes an index range read instead of a scan
-- of every returned order the account has: the all-time window's count read 12.7ms through
-- the old index, 0.2ms covered. The id tail is the same tie-break every sibling carries:
-- order dates are day-precise, so a busy day is a run of equal keys, and without it which
-- returns the card's six-row cut keeps was whatever order the plan happened to walk.
DROP INDEX idx_orders_user_status;
CREATE INDEX idx_orders_user_status ON orders(user_id, status, date, id);

-- The "Without category" rows, as their own tiny index. category_count sits in no index, so
-- every reader of `category_count = 0` -- the orders list's "Without category" filter (COUNT
-- and page both, ~30ms each), GET /categories/uncategorised (~30ms), and the palette's
-- has-uncategorised probe (which fires on any needle that is a substring of "without
-- category", single letters included, and whose LIMIT 1 never fills on a fully-categorised
-- account: all 50,000 rows probed to find nothing, ~30ms) -- walked the whole account through
-- a non-covering user index. A partial index holds exactly the uncategorised rows, with the
-- two summed columns alongside so the uncategorised rollup is index-only: 30ms -> ~0.00ms on
-- an account where every order is categorised, which is the state the probe's worst case
-- lives in. Near-zero rows on a categorised account means near-zero write cost.
CREATE INDEX idx_orders_user_uncategorised ON orders(user_id, total, saved)
	WHERE category_count = 0;

-- "Vendor, A to Z" could not come out of any index -- ORDER BY v.name COLLATE NOCASE
-- temp-B-tree-sorted every one of the account's rows on every page (18.5ms a page, and
-- settings.sort can make it an account's default). With the vendors side ordered by this
-- index, the list route walks vendors in name order and each vendor's orders through the
-- widened index above: 2.9ms, identical rows (routes/orders.js). Replaces idx_vendors_user
-- rather than joining it: the user_id prefix serves every reader the old index had.
DROP INDEX idx_vendors_user;
CREATE INDEX idx_vendors_user_name ON vendors(user_id, name COLLATE NOCASE);
