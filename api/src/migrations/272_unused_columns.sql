-- Columns nothing reads.
ALTER TABLE user_settings DROP COLUMN card_rows;
ALTER TABLE user_settings DROP COLUMN chart_period;
ALTER TABLE user_settings DROP COLUMN notify_email;
ALTER TABLE user_settings DROP COLUMN show_scan_card;
ALTER TABLE user_settings DROP COLUMN confirm_delete;
ALTER TABLE users DROP COLUMN pending_email;
ALTER TABLE uploads DROP COLUMN leave_as_draft;
ALTER TABLE uploads DROP COLUMN draft_order_id;
