-- The vendors and categories whose orders get an offer source's Check offers (Settings, Offers).
-- A source's row says its first picks are made, so a vendor the reader removes stays removed.
CREATE TABLE user_offer_sources (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	source_key TEXT NOT NULL,
	PRIMARY KEY (user_id, source_key)
);

CREATE TABLE user_offer_source_vendors (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	source_key TEXT NOT NULL,
	vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, source_key, vendor_id)
);
CREATE INDEX user_offer_source_vendors_vendor ON user_offer_source_vendors (vendor_id);

CREATE TABLE user_offer_source_categories (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	source_key TEXT NOT NULL,
	category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, source_key, category_id)
);
CREATE INDEX user_offer_source_categories_category ON user_offer_source_categories (category_id);
