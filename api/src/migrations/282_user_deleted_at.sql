-- When Delete account began (Settings 11g). Set, the account's address is already freed and nothing can
-- sign in to it, while its rows are removed in the background; a server that stops partway finishes on start.
ALTER TABLE users ADD COLUMN deleted_at INTEGER;
