/* The demo data every new account starts from — ported from react/src/api/seed.js so a fresh
   login isn't an empty app. Unlike that file, nothing here is read at request time: it is
   inserted once, per user, as real rows. Vendor/category spend, savings and share are not
   carried over because those are now derived from the orders themselves (see lib/decorate.js
   and the GET /vendors, /categories aggregates) rather than authored numbers that could drift
   from what the orders actually add up to. `period`/`periods` (the hand-authored monthly
   curves statistics used to read) have no counterpart here at all — real aggregation over
   these same orders (lib/stats.js) replaces that synthetic derivation entirely. */

import { newId } from './lib/ids.js'
import { toEpoch } from './lib/dates.js'

export const VENDORS = [
	{ key: 'proshop',    name: 'Proshop',    initials: 'PR', colour: '#235553', favourite: true,
		lead: 'Your biggest vendor: 48.210 kr. across 34 orders.' },
	{ key: 'bilka',      name: 'Bilka',      initials: 'BI', colour: '#877364', favourite: true,
		lead: 'Your most frequent vendor: 96 orders, 41.882 kr.' },
	{ key: 'fotex',      name: 'Føtex',      initials: 'FØ', colour: '#877364' },
	{ key: 'elgiganten', name: 'Elgiganten', initials: 'EL', colour: '#177DA7' },
	{ key: 'matas',      name: 'Matas',      initials: 'MA', colour: '#AD620D' },
	{ key: 'zalando',    name: 'Zalando',    initials: 'ZA', colour: '#8453F5' },
	{ key: 'jysk',       name: 'Jysk',       initials: 'JY', colour: '#235553' }
]

export const CATEGORIES = [
	{ key: 'groceries',   name: 'Groceries',       icon: 'cart',    colour: 'var(--icon-red)',    budget: 17000 },
	{ key: 'electronics', name: 'Electronics',     icon: 'plug',    colour: 'var(--icon-yellow)', budget: 14000 },
	{ key: 'household',   name: 'Household',       icon: 'home',    colour: 'var(--icon-purple)', budget: 6000 },
	{ key: 'homeoffice',  name: 'Home office',     icon: 'display', colour: 'var(--donut-blue)',  budget: 8000 },
	{ key: 'other',       name: 'Everything else', icon: 'tag',     colour: '#45524C',            budget: 0 }
]

export const ORDERS = [
	{ vendor: 'proshop', date: '2026-07-24', status: 'Delivered', kind: 'Expense',
		categories: ['electronics', 'homeoffice'], shipping: 49, reference: '303',
		items: [
			{ title: 'Dell UltraSharp U2723QE 27 tommer', quantity: 1, price: 3199, retail: 3649 },
			{ title: 'Logitech MX Master 3S', quantity: 1, price: 749, retail: 849,
				note: 'Replaces the one that drowned in coffee' },
			{ title: 'USB-C dock, 6 porte', quantity: 1, price: 249, retail: 299 },
			{ title: 'Kabelbindere, 100 stk.', quantity: 2, price: 26, retail: 32 }
		],
		attachments: [{ name: 'faktura-303.pdf', kind: 'pdf', meta: 'Scanned 24 July · 214 KB' }] },
	{ vendor: 'matas', date: '2026-07-21', status: 'Delivered', kind: 'Expense',
		categories: ['household'], shipping: 0,
		items: [
			{ title: 'Shampoo, 500 ml',    quantity: 2, price: 89.95,  retail: 104.95 },
			{ title: 'Tandpasta',          quantity: 3, price: 22.95,  retail: 26.95 },
			{ title: 'Håndsæbe, refill',   quantity: 4, price: 24.95,  retail: 26.95 },
			{ title: 'Solcreme faktor 30', quantity: 1, price: 179,    retail: 199 },
			{ title: 'Vitaminer, 90 stk.', quantity: 1, price: 114.95, retail: 132.95 }
		] },
	{ vendor: 'bilka', date: '2026-07-18', status: 'Delivered', kind: 'Expense',
		categories: ['groceries'], shipping: 0,
		items: [
			{ title: 'Rugbrød, skiveskåret', quantity: 1, price: 24.95 },
			{ title: 'Minimælk 1 l', quantity: 4, price: 10.95 },
			{ title: 'Kaffe, formalet 400 g', quantity: 1, price: 54.95 },
			{ title: 'Smør, 250 g', quantity: 1, price: 21.95 }
		],
		attachments: [{ name: 'kvittering-bilka.jpg', kind: 'image', meta: 'Scanned 18 July · 2,1 MB' }] },
	{ vendor: 'elgiganten', date: '2026-07-15', status: 'Delivered', kind: 'Expense',
		categories: ['electronics'], shipping: 0,
		items: [
			{ title: 'Sonos Era 100', quantity: 1, price: 1799, retail: 2199 },
			{ title: 'HDMI 2.1 kabel, 2 m', quantity: 2, price: 149, retail: 199 }
		] },
	{ vendor: 'bilka', date: '2026-07-09', status: 'Delivered', kind: 'Expense',
		categories: ['groceries', 'household'], shipping: 0,
		items: [
			{ title: 'Kyllingebryst, 700 g', quantity: 1, price: 74.95 },
			{ title: 'Æg, 10 stk.', quantity: 2, price: 32.95 }
		] },
	{ vendor: 'bilka', date: '2026-07-02', status: 'Delivered', kind: 'Expense',
		categories: ['groceries'], shipping: 0,
		items: [
			{ title: 'Havregryn, 1 kg', quantity: 2, price: 18.95 },
			{ title: 'Bananer, 1 kg', quantity: 1, price: 22.95 }
		] },
	{ vendor: 'zalando', date: '2026-07-05', status: 'Returned', kind: 'Expense',
		categories: ['other'], shipping: 0, refunded: true,
		items: [{ title: 'Løbesko, str. 43', quantity: 1, price: 799 }] },
	{ vendor: 'fotex', date: '2026-07-12', status: 'Delivered', kind: 'Expense',
		categories: ['groceries'], shipping: 0,
		items: [
			{ title: 'Frugtkasse, blandet', quantity: 1, price: 149, retail: 179 },
			{ title: 'Rødvin, 6 flasker',   quantity: 1, price: 449, retail: 534 }
		] },
	{ vendor: 'jysk', date: '2026-07-07', status: 'Ordered', kind: 'Expense',
		categories: ['household'], shipping: 79,
		items: [{ title: 'Skrivebordsstol', quantity: 1, price: 1299, retail: 1499 }] },
	{ vendor: 'proshop', date: '2026-07-03', status: 'Delivered', kind: 'Work',
		categories: ['homeoffice'], shipping: 0,
		items: [
			{ title: 'Mekanisk tastatur', quantity: 1, price: 899, retail: 1099 },
			{ title: 'Skærmarm',          quantity: 1, price: 549, retail: 649 }
		] },
	{ vendor: 'matas', date: '2026-06-27', status: 'Delivered', kind: 'Gift',
		categories: ['other'], shipping: 0,
		items: [{ title: 'Gavesæt, duft', quantity: 2, price: 249, retail: 299 }] },
	{ vendor: 'bilka', date: '2026-06-21', status: 'Delivered', kind: 'Expense',
		categories: ['groceries'], shipping: 0,
		items: [
			{ title: 'Grovboller, 6 stk.', quantity: 2, price: 19.95 },
			{ title: 'Hakket oksekød',     quantity: 3, price: 42.95 }
		] },
	{ vendor: 'elgiganten', date: '2026-06-14', status: 'Delivered', kind: 'Expense',
		categories: ['electronics'], shipping: 0,
		items: [{ title: 'Robotstøvsuger', quantity: 1, price: 2499, retail: 2999 }] },
	{ vendor: 'zalando', date: '2026-06-08', status: 'Delivered', kind: 'Expense',
		categories: ['other'], shipping: 0,
		items: [
			{ title: 'Regnjakke', quantity: 1, price: 699, retail: 899 },
			{ title: 'Uldsokker, 3-pak', quantity: 2, price: 129, retail: 149 }
		] },
	{ vendor: 'fotex', date: '2026-05-30', status: 'Delivered', kind: 'Expense',
		categories: ['groceries', 'household'], shipping: 0,
		items: [
			{ title: 'Vaskemiddel, 2 l', quantity: 1, price: 64.95 },
			{ title: 'Kartofler, 2 kg',  quantity: 2, price: 24.95 }
		] }
]

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
	sort: 'date-desc', showScanCard: true, confirmDelete: true
}

/** Inserts the demo dataset for a freshly registered user. Runs inside the caller's
    transaction (db.transaction wraps the whole register flow). */
export function seedDemoData(db, userId) {
	const vendorId = {}
	const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, lead)
		VALUES (@id, @userId, @name, @initials, @colour, @favourite, @lead)`)
	for (const v of VENDORS) {
		const id = newId('v')
		vendorId[v.key] = id
		insertVendor.run({ id, userId, name: v.name, initials: v.initials, colour: v.colour,
			favourite: v.favourite ? 1 : 0, lead: v.lead ?? null })
	}

	const categoryId = {}
	const insertCategory = db.prepare(`INSERT INTO categories (id, user_id, name, icon, colour, budget)
		VALUES (@id, @userId, @name, @icon, @colour, @budget)`)
	for (const c of CATEGORIES) {
		const id = newId('c')
		categoryId[c.key] = id
		insertCategory.run({ id, userId, name: c.name, icon: c.icon, colour: c.colour, budget: c.budget })
	}

	const insertOrder = db.prepare(`INSERT INTO orders (id, user_id, vendor_id, date, status, kind, shipping, note, reference, refunded)
		VALUES (@id, @userId, @vendorId, @date, @status, @kind, @shipping, @note, @reference, @refunded)`)
	const insertOrderCategory = db.prepare(`INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)`)
	const insertItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
		VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, @note)`)
	const insertAttachment = db.prepare(`INSERT INTO attachments (id, order_id, name, kind, meta) VALUES (@id, @orderId, @name, @kind, @meta)`)

	for (const o of ORDERS) {
		const id = newId('o')
		insertOrder.run({
			id, userId, vendorId: vendorId[o.vendor], date: toEpoch(o.date), status: o.status, kind: o.kind,
			shipping: o.shipping ?? 0, note: o.note ?? '', reference: o.reference ?? '', refunded: o.refunded ? 1 : 0
		})
		for (const key of o.categories) insertOrderCategory.run(id, categoryId[key])
		o.items.forEach((item, position) => insertItem.run({
			id: newId('i'), orderId: id, position, title: item.title, quantity: item.quantity,
			price: item.price, retail: item.retail ?? null, note: item.note ?? null
		}))
		for (const a of o.attachments ?? [])
			insertAttachment.run({ id: newId('a'), orderId: id, name: a.name, kind: a.kind, meta: a.meta })
	}

	db.prepare(`INSERT INTO settings (user_id, default_kind, default_status, page_size, sort, show_scan_card, confirm_delete)
		VALUES (@userId, @defaultKind, @defaultStatus, @pageSize, @sort, @showScanCard, @confirmDelete)`)
		.run({ userId, ...DEFAULT_SETTINGS, showScanCard: DEFAULT_SETTINGS.showScanCard ? 1 : 0,
			confirmDelete: DEFAULT_SETTINGS.confirmDelete ? 1 : 0 })

	const insertCard = db.prepare(`INSERT INTO dashboard_cards (user_id, key, position, on_dashboard) VALUES (?, ?, ?, ?)`)
	DASHBOARD_CARDS.forEach((c, position) => insertCard.run(userId, c.key, position, c.on ? 1 : 0))
}
