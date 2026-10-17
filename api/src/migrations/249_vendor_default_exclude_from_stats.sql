-- Whether a new order from this vendor starts left out of statistics. Like the default categories, it is
-- copied onto the order when it is made; a saved order keeps its own value.
ALTER TABLE vendors ADD COLUMN default_exclude_from_stats INTEGER NOT NULL DEFAULT 0;
