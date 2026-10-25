-- How many saved views the sidebar lists is a setting the account picks, so it lives with the other settings.
-- NULL means the account has not picked one yet.
ALTER TABLE user_settings ADD COLUMN saved_views_shown INTEGER;
UPDATE user_settings SET saved_views_shown = (SELECT u.saved_views_shown FROM users u WHERE u.id = user_settings.user_id);
ALTER TABLE users DROP COLUMN saved_views_shown;
