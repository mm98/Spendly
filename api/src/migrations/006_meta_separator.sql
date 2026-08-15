-- App-written meta strings ("Image · 1 KB") baked the old separator into stored rows, so the
-- code writing "|" from now on would have left every existing attachment reading the middle
-- dot forever. App-generated strings only -- user content (notes, titles, names) is untouched.
UPDATE attachments SET meta = replace(meta, '·', '|') WHERE meta LIKE '%·%';
