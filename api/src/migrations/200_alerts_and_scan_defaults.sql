-- How loudly a category's limit speaks up (Duplicate and alerts 8b), and whether a scan may set a
-- new order's kind and status from what the document shows (Settings 11a, Defaults).
-- notify_early is the share of a limit, in percent, from which a warning shows; 100 means only over.
ALTER TABLE settings ADD COLUMN notify_while_saving INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notify_monthly_summary INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notify_early INTEGER NOT NULL DEFAULT 90 CHECK (notify_early IN (75, 90, 100));
ALTER TABLE settings ADD COLUMN scan_overrides INTEGER NOT NULL DEFAULT 1;
