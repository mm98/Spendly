-- Dashboard card keys, spelled out.
--
-- The catalogue shipped with abbreviations -- `vendors`, `saved`, `pace`, `favcats` -- chosen
-- when there were six cards and no two of them were about the same kind of thing. That stops
-- being true as the catalogue grows: `vendors` names Top vendors, but Favourite vendors is a
-- card about vendors too, and `saved` names Saved vs retail beside four other cards that print
-- a saving. An abbreviation is only unambiguous against the list that existed when it was
-- picked, and this list is meant to be added to.
--
-- So the key is the card's own name in full, lower_snake_case: nothing to look up, nothing for
-- the next card to collide with, and a stored row that says what it is when read on its own.
-- This renames what accounts already hold. It is not a change to anybody's dashboard -- same
-- cards, same order, same on/off -- only to what the rows are called.
--
-- The PRIMARY KEY is (user_id, key), and none of the new names exists yet, so no row can
-- collide with one already there.
UPDATE dashboard_cards SET key = 'spending_rhythm'      WHERE key = 'rhythm';
UPDATE dashboard_cards SET key = 'category_breakdown'   WHERE key = 'breakdown';
UPDATE dashboard_cards SET key = 'top_vendors'          WHERE key = 'vendors';
UPDATE dashboard_cards SET key = 'favourite_categories' WHERE key = 'favcats';
UPDATE dashboard_cards SET key = 'saved_vs_retail'      WHERE key = 'saved';
UPDATE dashboard_cards SET key = 'monthly_pace'         WHERE key = 'pace';

-- Favourite vendors is new in the same change and has no released rows to rename; the line is
-- here for a development database that ran the card before its key was spelled out.
UPDATE dashboard_cards SET key = 'favourite_vendors'    WHERE key = 'favvendors';

-- Anything left that the catalogue does not know is dropped rather than carried. A stored key
-- with no catalogue entry behind it is a card the client cannot name or draw, and the two GET
-- readers answer it differently: the tray builds from the catalogue and never sees it, while
-- the dashboard builds from these rows and would ask for a name that is not there. Losing an
-- unknown row costs nothing -- a card the catalogue has forgotten cannot be rendered anyway --
-- and the route that writes this table re-inserts a row for every catalogue key on the next
-- save, so an account that is missing one is missing it only until it next edits its cards.
DELETE FROM dashboard_cards WHERE key NOT IN (
	'spending_rhythm', 'category_breakdown', 'top_vendors', 'top_categories',
	'favourite_categories', 'favourite_vendors', 'saved_vs_retail', 'monthly_pace');
