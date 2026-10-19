-- a lock-out holds for one address from one network address, so nobody can keep another person locked out
ALTER TABLE user_login_failures ADD COLUMN ip_address TEXT;
DROP INDEX idx_user_login_failures_email_at;
CREATE INDEX idx_user_login_failures_email_ip_at ON user_login_failures(email, ip_address, at);
