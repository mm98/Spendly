-- The language Spendly's words are shown in (11a), apart from the locale; 'auto' follows the browser.
ALTER TABLE user_settings ADD COLUMN language TEXT NOT NULL DEFAULT 'auto';
