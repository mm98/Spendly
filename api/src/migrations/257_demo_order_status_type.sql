-- Every order's status type, read again from its status, for orders written while its triggers were off.
UPDATE orders SET status_type = COALESCE(
	(SELECT s.type FROM statuses s WHERE s.user_id = orders.user_id AND s.key = orders.status), 'custom')
WHERE status_type IS NOT COALESCE(
	(SELECT s.type FROM statuses s WHERE s.user_id = orders.user_id AND s.key = orders.status), 'custom');
