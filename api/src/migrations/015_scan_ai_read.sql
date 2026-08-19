-- What the AI reader found in an uploaded document, cached against the upload row it read --
-- so a reload of /scan/reading or /scan/review (both fetch GET /scan/draft/:key for the same
-- key, per Scan.jsx's own comment on that) reuses one read instead of paying for the model
-- again per fetch. NULL is not "read and found nothing"; it is "not read yet, or the read
-- failed" -- both cases the route already falls back to the same honest blank draft for.
ALTER TABLE scan_uploads ADD COLUMN ai_read_json TEXT;
