/* What a freshly registered account needs to function, and nothing more -- a settings row and
   a dashboard_cards row per catalogue entry, both read by GET routes that would otherwise have
   no row to find. This used to also insert a demo dataset (vendors, categories, orders) ported
   from react/src/api/seed.js, so a fresh login wasn't an empty app -- dropped because a brand
   new account seeing someone else's-looking orders, vendor names and receipts read as a data
   leak rather than a demo, the one impression a personal-finance app can least afford to give.
   An account now starts genuinely empty: no vendor, no category, no order until the user adds
   one themselves. */

/* Which of the catalogue's cards a new account opens Home with, in this order. Keys are the
   catalogue's own (lib/constants.js) -- spelled out in full, for the reason stated there. */
export const DASHBOARD_CARDS = [
	{ key: 'spending_rhythm',      on: true },
	{ key: 'category_breakdown',   on: true },
	{ key: 'top_vendors',          on: true },
	{ key: 'top_categories',       on: false },
	{ key: 'favourite_categories', on: false },
	{ key: 'favourite_vendors',    on: false },
	{ key: 'saved_vs_retail',      on: false },
	{ key: 'monthly_pace',         on: false }
]

export const DEFAULT_SETTINGS = {
	defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10,
	sort: 'date-desc', showScanCard: true, confirmDelete: true,
	// Six rows a card, and the vendors and categories lists opening alphabetically.
	cardRows: 6, listSort: 'name-asc',
	// The ledger's unit. DKK because the app printed "kr." unconditionally before this was a
	// setting, so it is what every existing account's figures already meant.
	currency: 'DKK',
	// How dates and times are printed. 'auto' means keep asking the browser, which is what
	// every account got before the column existed and the right answer wherever a reader's
	// browser language and their region already agree. Registration overrides it when the
	// client managed to work out where the reader is (see routes/auth.js).
	locale: 'auto',
	// The window the Vendors and Categories rings both draw from.
	chartPeriod: 'month'
}

/** Inserts the settings row and dashboard-card rows every account needs. Runs inside the
    caller's transaction (db.transaction wraps the whole register/reset flow).

    `overrides` carries the few defaults a caller can know better than this file does -- today
    just the locale, which registration works out from the browser and a reset deliberately
    does not, since the account resetting has a reader in front of it who has already been
    offered the choice. Validated by the caller: what arrives here is written. */
export function seedAccountDefaults(db, userId, overrides = {}) {
	const settings = { ...DEFAULT_SETTINGS, ...overrides }
	db.prepare(`INSERT INTO settings (user_id, default_kind, default_status, page_size, sort,
		show_scan_card, confirm_delete, card_rows, list_sort, currency, locale, chart_period)
		VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard,
			@confirmDelete, @cardRows, @listSort, @currency, @locale, @chartPeriod)`)
		.run({ userId, ...settings, showScanCard: settings.showScanCard ? 1 : 0,
			confirmDelete: settings.confirmDelete ? 1 : 0 })

	const insertCard = db.prepare(`INSERT INTO dashboard_cards (user_id, key, position, on_dashboard) VALUES (?, ?, ?, ?)`)
	DASHBOARD_CARDS.forEach((c, position) => insertCard.run(userId, c.key, position, c.on ? 1 : 0))
}
