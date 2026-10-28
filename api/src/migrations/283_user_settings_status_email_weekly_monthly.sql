-- The status email is two switches, Weekly and Monthly, either, both or neither (11a). Each keeps
-- the last period it sent, since a weekly and a monthly period have ids of different shapes.
ALTER TABLE user_settings ADD COLUMN status_email_weekly INTEGER NOT NULL DEFAULT 0 CHECK (status_email_weekly IN (0, 1));
ALTER TABLE user_settings ADD COLUMN status_email_monthly INTEGER NOT NULL DEFAULT 0 CHECK (status_email_monthly IN (0, 1));
ALTER TABLE user_settings ADD COLUMN status_email_weekly_sent TEXT;
ALTER TABLE user_settings ADD COLUMN status_email_monthly_sent TEXT;
UPDATE user_settings SET status_email_weekly = 1, status_email_weekly_sent = status_email_sent WHERE status_email = 'weekly';
UPDATE user_settings SET status_email_monthly = 1, status_email_monthly_sent = status_email_sent WHERE status_email = 'monthly';
ALTER TABLE user_settings DROP COLUMN status_email_sent;
ALTER TABLE user_settings DROP COLUMN status_email;
