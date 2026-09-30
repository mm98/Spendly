-- An account whose line in the sheet's totals is drawn in grey. Only the look: its costs still
-- count in every sum.
ALTER TABLE budget_accounts ADD COLUMN grey INTEGER NOT NULL DEFAULT 0;
