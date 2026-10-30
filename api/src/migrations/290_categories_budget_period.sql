-- The period a category's limit is for (Vendors and categories 5i): one amount for each calendar month,
-- or one for the calendar year. In step with CATEGORY_BUDGET_PERIODS in lib/constants.js.
ALTER TABLE categories ADD COLUMN budget_period TEXT NOT NULL DEFAULT 'month' CHECK (budget_period IN ('month', 'year'));
