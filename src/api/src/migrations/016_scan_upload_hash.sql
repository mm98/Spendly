-- The bytes' own SHA-256, taken once at upload -- what lets a second upload of the same
-- receipt (a reader who scans twice, or drops a photo and its own re-export) find the row the
-- first one already read, and reuse ai_read_json instead of paying the model a second time for
-- an answer already sitting on the account. Scoped per account rather than globally: two
-- readers who happen to buy the same thing on the same receipt are not the same document to
-- either of them, and a global index would leak one account's upload into another's dedup hit.
ALTER TABLE scan_uploads ADD COLUMN sha256 TEXT;
CREATE INDEX idx_scan_uploads_user_hash ON scan_uploads(user_id, sha256);
