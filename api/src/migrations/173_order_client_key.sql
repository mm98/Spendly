-- The key of the save that last wrote an order, chosen by the browser that sent it. A save sent
-- again after its answer was lost to the connection (6d) is then recognised, not done twice.
ALTER TABLE orders ADD COLUMN client_key TEXT;
CREATE UNIQUE INDEX idx_orders_client_key ON orders(user_id, client_key) WHERE client_key IS NOT NULL;
