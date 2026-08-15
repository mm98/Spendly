import { db } from '../db.js'
import { DEFAULT_SETTINGS } from '../seed.js'

const selectCardRows = db.prepare('SELECT card_rows FROM settings WHERE user_id = ?')

/** How many entries a card fills with, for this account.

    Read here rather than passed in, because every route that truncates a list needs the same
    answer and threading it through each of them means every caller has to know to ask -- which
    is how the app ended up with a card cut to three, one cut to four, one cut to five and one
    cut to ten, four numbers nobody had chosen together. The routes below each hold a list a
    card draws; the setting is the one place the length is decided.

    Not every truncation is one of these. A ring's legend folds at ten because eleven arcs stop
    being readable as arcs, and the command palette shows a handful of each kind because it is a
    search result and not a card -- neither is an entry count a person would want to set, and
    both would be worse for following this one. */
export const cardRowsFor = userId =>
	selectCardRows.get(userId)?.card_rows ?? DEFAULT_SETTINGS.cardRows
