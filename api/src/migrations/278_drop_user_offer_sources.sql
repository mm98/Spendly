-- Check offers on orders is gone, so the vendors and categories picked for it are no longer read.
DROP TABLE IF EXISTS user_offer_source_categories;
DROP TABLE IF EXISTS user_offer_source_vendors;
DROP TABLE IF EXISTS user_offer_sources;
