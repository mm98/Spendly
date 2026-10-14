/* What a freshly registered account needs to function, and nothing more -- a settings row,
   read by GET routes that would otherwise have no row to find. This does not insert a demo dataset: a brand new account seeing someone
   else's-looking orders, vendor names and receipts would read as a data leak rather than a
   demo, the one impression a personal-finance app can least afford to give. An account starts
   genuinely empty: no vendor, no category, no order until the user adds one themselves. */

export const DEFAULT_SETTINGS = {
	defaultKind: 'Expense', defaultStatus: 'Delivered', pageSize: 10,
	sort: 'date-desc',
	// The vendors and categories lists opening alphabetically.
	listSort: 'name-asc',
	// The ledger's unit. DKK because every figure in the app is printed as "kr." by default,
	// so a new account's currency has to match what its own figures already mean.
	currency: 'DKK',
	// How dates and times are printed. 'auto' means keep asking the browser, which is what
	// every account got before the column existed and the right answer wherever a reader's
	// browser language and their region already agree. Registration overrides it when the
	// client managed to work out where the reader is (see routes/auth.js).
	locale: 'auto'
}

/** Inserts the settings row every account needs, inside the caller's transaction. `overrides`
    carries what registration knows better (the locale), validated by the caller. */
export function seedAccountDefaults(db, userId, overrides = {}) {
	const settings = { ...DEFAULT_SETTINGS, ...overrides }
	// show_scan_card and confirm_delete are NOT NULL without a default; nothing reads them
	db.prepare(`INSERT INTO user_settings (user_id, default_kind, default_status, page_size, sort,
		show_scan_card, confirm_delete, list_sort, currency, locale)
		VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, 1, 1, @listSort, @currency, @locale)`)
		.run({ userId, ...settings })
}
