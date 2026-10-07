-- Which earlier month Home measures the current month against: the month before, or the same month a year ago.
ALTER TABLE settings ADD COLUMN compare_month TEXT NOT NULL DEFAULT 'last' CHECK (compare_month IN ('last', 'year'));
