-- A row's series is the same row in every year: a year copied from another keeps each row's
-- series, so a bank payment placed on a row finds it in every year and after a rename.
-- The series id is the id of the row that started it.
ALTER TABLE budget_lines ADD COLUMN series_id TEXT;
UPDATE budget_lines SET series_id = id;

-- Rows of one kind with the same name are one series across years, as the bank check matched them
-- by name. Within one year the first of them by group and row order is the one in the series.
CREATE TEMP TABLE budget_line_series_by_name AS
WITH named AS (
	SELECT l.id, l.user_id, g.kind,
		lower(trim(replace(replace(replace(replace(replace(replace(l.name,
			'Æ', 'æ'), 'Ø', 'ø'), 'Å', 'å'), 'Ä', 'ä'), 'Ö', 'ö'), 'Ü', 'ü'))) AS name_key,
		row_number() OVER (PARTITION BY l.user_id, g.year_id, g.kind,
			lower(trim(replace(replace(replace(replace(replace(replace(l.name,
				'Æ', 'æ'), 'Ø', 'ø'), 'Å', 'å'), 'Ä', 'ä'), 'Ö', 'ö'), 'Ü', 'ü')))
			ORDER BY g.position, l.position, l.id) AS nth
	FROM budget_lines l JOIN budget_groups g ON g.id = l.group_id
)
SELECT id, user_id, kind, name_key, min(id) OVER (PARTITION BY user_id, kind, name_key) AS series_id
FROM named WHERE nth = 1;

UPDATE budget_lines SET series_id = s.series_id FROM budget_line_series_by_name s WHERE s.id = budget_lines.id;

-- A link keeps the row's name too: a year built by hand, not copied, still finds its row by name.
-- A name no row has keeps no series and works by name alone.
ALTER TABLE budget_bank_links ADD COLUMN line_series_id TEXT;
UPDATE budget_bank_links SET line_series_id = (
	SELECT s.series_id FROM budget_line_series_by_name s
	WHERE s.user_id = budget_bank_links.user_id AND s.kind = budget_bank_links.kind
		AND s.name_key = lower(trim(replace(replace(replace(replace(replace(replace(budget_bank_links.line_name,
			'Æ', 'æ'), 'Ø', 'ø'), 'Å', 'å'), 'Ä', 'ä'), 'Ö', 'ö'), 'Ü', 'ü')))
	LIMIT 1
) WHERE line_name IS NOT NULL;

DROP TABLE budget_line_series_by_name;
