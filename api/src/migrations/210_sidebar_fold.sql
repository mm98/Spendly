-- Whether the account's sidebar opens folded to the rail on a wide window (Navigation shell 9i).
ALTER TABLE settings ADD COLUMN sidebar TEXT NOT NULL DEFAULT 'open' CHECK (sidebar IN ('open', 'rail'));
