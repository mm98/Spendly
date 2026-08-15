-- The separator settled on the bullet (U+2022): the pipe was the interim escape from the
-- middle dot, and stored attachment metas carry whichever separator was current when their
-- row was written. App-generated strings only, as in 006.
UPDATE attachments SET meta = replace(meta, ' | ', ' • ') WHERE meta LIKE '% | %';
