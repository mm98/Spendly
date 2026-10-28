-- The account's colour scheme (11a), one of the data-scheme ids in styles/schemes.css; the server checks the id.
ALTER TABLE user_settings ADD COLUMN colour_scheme TEXT NOT NULL DEFAULT 'green';
