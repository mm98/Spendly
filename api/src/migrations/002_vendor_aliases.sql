-- Other names a vendor answers to: the name it had before a rename, the shortened form an
-- invoice prints. Anything that resolves a vendor from a string (order create/update, bulk
-- import, a scanned receipt's vendor line) matches these exactly like the name itself
-- (lib/findOrCreate.js), so a document naming the old form files under the vendor instead
-- of creating a twin. An alias is never equal to its own vendor's name -- the routes refuse
-- that -- and renaming a vendor to one of its aliases swaps the two rather than storing the
-- same string twice.
CREATE TABLE vendor_aliases (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
	name TEXT NOT NULL
);

-- One owner per string: resolution reads a string back to exactly one vendor, so the same
-- alias on two vendors is an ambiguity, not a preference. Case-insensitive, because the
-- resolution is.
CREATE UNIQUE INDEX idx_vendor_aliases_user_name ON vendor_aliases(user_id, lower(name));
CREATE INDEX idx_vendor_aliases_vendor ON vendor_aliases(vendor_id);
