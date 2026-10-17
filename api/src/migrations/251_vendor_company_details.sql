-- What an invoice made from a vendor's orders prints in its From box. country is an ISO 3166 code.
-- A Danish vendor is named in the CVR register by cvr; a vendor outside Denmark has a typed vat_number.
-- address is typed, and used only when the register gives none.
ALTER TABLE vendors ADD COLUMN country TEXT NOT NULL DEFAULT 'DK';
ALTER TABLE vendors ADD COLUMN cvr TEXT;
ALTER TABLE vendors ADD COLUMN vat_number TEXT;
ALTER TABLE vendors ADD COLUMN address TEXT;
-- A Danish vendor without a CVR number is searched in the register by its Name: the Name last searched,
-- the best match found (offered on the vendor page), and the Name for which the reader said Not this one.
ALTER TABLE vendors ADD COLUMN cvr_match TEXT;
ALTER TABLE vendors ADD COLUMN cvr_match_searched_name TEXT;
ALTER TABLE vendors ADD COLUMN cvr_match_dismissed_name TEXT;

-- the background check reads the vendors with a CVR number, across every account
CREATE INDEX idx_vendors_cvr ON vendors(cvr) WHERE cvr IS NOT NULL;

-- What the CVR register says about a company, shared by every vendor and invoice with its number,
-- so one number is looked up once. found = 0 is a number the register does not know.
CREATE TABLE cvr_companies (
	cvr TEXT PRIMARY KEY,
	found INTEGER NOT NULL,
	name TEXT,
	ceased_on TEXT,
	checked_at INTEGER NOT NULL
);

-- A company's addresses, each from the day it was first seen, so an invoice prints the one its order's
-- date falls in. address holds its lines joined by a line break.
CREATE TABLE cvr_company_addresses (
	cvr TEXT NOT NULL REFERENCES cvr_companies(cvr) ON DELETE CASCADE,
	valid_from TEXT NOT NULL,
	address TEXT NOT NULL,
	PRIMARY KEY (cvr, valid_from)
);

-- How many register lookups each day has used: the register answers a set number a day.
CREATE TABLE cvr_lookup_days (
	day TEXT PRIMARY KEY,
	used INTEGER NOT NULL DEFAULT 0
);
