-- What an item's name means, as numbers, so category suggestions can tell that two names in
-- different languages are the same kind of thing. One row per account, model and folded name;
-- the model is part of the key because vectors from two models cannot be compared.
CREATE TABLE title_vectors (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	model TEXT NOT NULL,
	key TEXT NOT NULL,
	vec BLOB NOT NULL,
	PRIMARY KEY (user_id, model, key)
) WITHOUT ROWID;
