-- Invoices, vendor company details and the CVR register lookup are removed from the app.
DROP TRIGGER IF EXISTS orders_number_insert;
ALTER TABLE orders DROP COLUMN number;
ALTER TABLE users DROP COLUMN order_number_last;

DROP INDEX IF EXISTS idx_vendors_cvr;
ALTER TABLE vendors DROP COLUMN country;
ALTER TABLE vendors DROP COLUMN cvr;
ALTER TABLE vendors DROP COLUMN vat_number;
ALTER TABLE vendors DROP COLUMN address;
ALTER TABLE vendors DROP COLUMN cvr_match;
ALTER TABLE vendors DROP COLUMN cvr_match_searched_name;
ALTER TABLE vendors DROP COLUMN cvr_match_dismissed_name;

DROP TABLE IF EXISTS cvr_company_addresses;
DROP TABLE IF EXISTS cvr_companies;
DROP TABLE IF EXISTS cvr_lookup_days;
DROP TABLE IF EXISTS user_invoice_recipients;
