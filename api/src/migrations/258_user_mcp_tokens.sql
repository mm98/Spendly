-- A token an assistant program uses to read one account over /mcp. Only its hash is kept: the token
-- itself is shown once, when it is made.
CREATE TABLE user_mcp_tokens (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	last_used_at INTEGER
);
CREATE INDEX idx_user_mcp_tokens_user ON user_mcp_tokens(user_id, created_at);
