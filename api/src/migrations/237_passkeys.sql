-- A passkey (20a, Settings > Passkeys): one credential a device or a password manager holds for an
-- account. It sits beside the password, never instead of it. The id is the credential's own id.
CREATE TABLE passkeys (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	public_key BLOB NOT NULL,
	counter INTEGER NOT NULL DEFAULT 0,
	-- how the device can be reached (usb, internal, hybrid...), as JSON, handed back when it is asked
	transports TEXT,
	name TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	last_used_at INTEGER
);
CREATE INDEX idx_passkeys_user ON passkeys(user_id, created_at);
