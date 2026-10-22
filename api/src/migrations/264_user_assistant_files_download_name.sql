-- The name a downloaded file starts with, before the time it was asked: the heading Spendly wrote at the
-- top of the file, "Orders in October 2026". NULL for a file made before it was kept, which uses the question.
ALTER TABLE user_assistant_files ADD COLUMN download_name TEXT;
