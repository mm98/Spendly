-- The categories an order starts with when it names this vendor. A convenience rather than a
-- record: the categories a saved order actually carries are its own order_categories rows,
-- written when the order is saved, so a default changed afterwards never rewrites history.
--
-- ON DELETE CASCADE both ways, unlike order_categories, whose category_id deliberately has none
-- (a category on an order is history, and routes/categories.js refuses to delete a category any
-- order still carries). A default is neither: it should follow its vendor into the bin and
-- disappear quietly when its category is deleted, rather than standing between the account and
-- deleting a category it no longer wants.
CREATE TABLE vendor_default_categories (
	vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
	category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
	PRIMARY KEY (vendor_id, category_id)
);
