-- A vendor on one of the five given colours that fail 4.5:1 in the dark theme takes the swatch its
-- name hashes to (c2). The hash is palette.js colourFor: over the name's characters, the sum of each one's first UTF-16 code unit, mod 8.
WITH RECURSIVE chars(id, name, i, total) AS (
	SELECT id, name, 1, 0 FROM vendors
	WHERE lower(colour) IN ('#877364', '#177da7', '#ad620d', '#8453f5', '#b4552b')
	UNION ALL
	SELECT id, name, i + 1, total + CASE
		WHEN unicode(substr(name, i, 1)) > 65535 THEN 55296 + ((unicode(substr(name, i, 1)) - 65536) >> 10)
		ELSE unicode(substr(name, i, 1)) END
	FROM chars WHERE i <= length(name)
),
sums(id, total) AS (
	SELECT id, max(total) FROM chars GROUP BY id
)
UPDATE vendors SET colour = (
	SELECT CASE sums.total % 8
		WHEN 0 THEN '#1d4d33' WHEN 1 THEN '#2f7a51' WHEN 2 THEN '#4f7f63' WHEN 3 THEN '#8caf97'
		WHEN 4 THEN '#7a5c23' WHEN 5 THEN '#d3b98a' WHEN 6 THEN '#8a4a41' ELSE '#b3b1a9' END
	FROM sums WHERE sums.id = vendors.id)
WHERE id IN (SELECT id FROM sums);
