/* What a freshly registered account needs to function, and nothing more -- a settings row and
   a dashboard_cards row per catalogue entry, both read by GET routes that would otherwise have
   no row to find. This used to also insert a demo dataset (vendors, categories, orders) ported
   from react/src/api/seed.js, so a fresh login wasn't an empty app -- dropped because a brand
   new account seeing someone else's-looking orders, vendor names and receipts read as a data
   leak rather than a demo, the one impression a personal-finance app can least afford to give.
   An account now starts genuinely empty: no vendor, no category, no order until the user adds
   one themselves. */

export const DASHBOARD_CARDS = [
	{ key: 'rhythm',    on: true },
	{ key: 'breakdown', on: true },
	{ key: 'vendors',   on: true },
	{ key: 'favcats',   on: false },
	{ key: 'saved',     on: false },
	{ key: 'pace',      on: false }
]

export const DEFAULT_SETTINGS = {
	defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10,
	sort: 'date-desc', showScanCard: true, confirmDelete: true,
	// Six rows a card, and the vendors and categories lists opening alphabetically.
	cardRows: 6, listSort: 'name-asc',
	// The ledger's unit. DKK because the app printed "kr." unconditionally before this was a
	// setting, so it is what every existing account's figures already meant.
	currency: 'DKK'
}

/** Inserts the settings row and dashboard-card rows every account needs. Runs inside the
    caller's transaction (db.transaction wraps the whole register/reset flow). */
export function seedAccountDefaults(db, userId) {
	db.prepare(`INSERT INTO settings (user_id, default_kind, default_status, page_size, sort,
		show_scan_card, confirm_delete, card_rows, list_sort, currency)
		VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard,
			@confirmDelete, @cardRows, @listSort, @currency)`)
		.run({ userId, ...DEFAULT_SETTINGS, showScanCard: DEFAULT_SETTINGS.showScanCard ? 1 : 0,
			confirmDelete: DEFAULT_SETTINGS.confirmDelete ? 1 : 0 })

	const insertCard = db.prepare(`INSERT INTO dashboard_cards (user_id, key, position, on_dashboard) VALUES (?, ?, ?, ?)`)
	DASHBOARD_CARDS.forEach((c, position) => insertCard.run(userId, c.key, position, c.on ? 1 : 0))
}
