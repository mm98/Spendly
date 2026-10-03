-- Where a vendor came from: 'scan' when a receipt scan made it (5a), NULL when a person did.
ALTER TABLE vendors ADD COLUMN origin TEXT CHECK (origin IN ('scan'));

-- The order whose save made this vendor. When that order's scanned receipt is attached, the
-- vendor is known to come from the scan.
ALTER TABLE vendors ADD COLUMN made_by_order TEXT;
