-- Two more account preferences, both about how a list is drawn rather than what is in it.
--
-- card_rows: how many entries a card on Home fills with. Was a constant in the client, which
-- made "ten" a fact about the build rather than a choice about the account -- and the cards
-- share a grid row, so the number decides how much of that row each of them uses.
--
-- list_sort: the order the vendors and categories lists open in. One column, not two, because
-- the setting is one answer to one question -- these are the same kind of list, and a person who
-- wants them alphabetical wants both of them alphabetical. Stored as the key rather than the
-- label so the printed word can change without rewriting every row: 'name' | 'spend' | 'saved',
-- the three orders both lists have in common (vendors also offer Orders, categories Share, and
-- neither can be the shared default because the other list cannot honour it).
--
-- Defaults match what the two pages hardcoded before this existed, so an account that never
-- touches either setting is drawn exactly as it was.
ALTER TABLE settings ADD COLUMN card_rows INTEGER NOT NULL DEFAULT 10;
ALTER TABLE settings ADD COLUMN list_sort TEXT NOT NULL DEFAULT 'name';
