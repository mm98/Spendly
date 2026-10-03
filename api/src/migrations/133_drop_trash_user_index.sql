-- A trashed order is found by its own id, so a per-account index on it is never read.
DROP INDEX IF EXISTS idx_order_trash_user;
