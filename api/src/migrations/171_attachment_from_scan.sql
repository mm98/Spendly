-- Whether a file came from a receipt scan: such a file is evidence the reader did not make and
-- cannot take again, so removing it asks first (17a). The meta line already said "Scanned".
ALTER TABLE attachments ADD COLUMN from_scan INTEGER NOT NULL DEFAULT 0;
UPDATE attachments SET from_scan = 1 WHERE meta LIKE 'Scanned%';
