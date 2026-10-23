import { db } from '../db.js'
import { newId } from './ids.js'
import { CATEGORY_PALETTE, VENDOR_PALETTE, nthColour } from './palette.js'

/* A stretch of plausible ledger — a year by default, up to decades — for looking at the app
   with something in it.

   Demo data is opt-in only, never auto-seeded onto a new account: nothing arrives unasked, and
   a signed-in user presses a button to fill their own account. Seeding it automatically would
   make a fresh account look pre-populated with someone else's orders, which reads as a data
   leak rather than a demo.

   Every vendor and every category is given its colour by index rather than by hashing its
   name, so the set is distinct by construction: a hash is free to hand two vendors the same
   entry, which is exactly how a breakdown ring ends up drawn in one colour. Both palettes are
   long enough for the sets below (12 vendors into 12, 10 categories into 10).

   Totals are chosen before the basket and the basket scaled onto them. Left to a random pile
   of items, five lines at quantity three multiply out to an order twenty times its
   neighbours, and every chart here scales to the window's maximum -- so one such order
   flattens a whole month into the axis and the charts document nothing. */

const VENDORS = [
	{ name: 'Proshop', initials: 'PR', favourite: 1, lead: 'Your biggest vendor.' },
	{ name: 'Bilka', initials: 'BI', favourite: 1, lead: 'Your most frequent vendor.' },
	{ name: 'Føtex', initials: 'FØ' },
	{ name: 'Elgiganten', initials: 'EL' },
	{ name: 'Matas', initials: 'MA' },
	{ name: 'Zalando', initials: 'ZA' },
	{ name: 'Jysk', initials: 'JY' },
	{ name: 'IKEA', initials: 'IK' },
	{ name: 'Netto', initials: 'NE' },
	{ name: 'Coop', initials: 'CO' },
	{ name: 'Power', initials: 'PO' },
	{ name: 'Normal', initials: 'NO' }
]

const CATEGORIES = [
	{ name: 'Groceries', icon: 'shopping-cart', budget: 4500 },
	{ name: 'Electronics', icon: 'plug', budget: 1800 },
	{ name: 'Household', icon: 'home', budget: 900 },
	{ name: 'Home office', icon: 'device-desktop', budget: 700 },
	{ name: 'Clothing', icon: 'shirt', budget: 800 },
	{ name: 'Health', icon: 'first-aid-kit', budget: 500 },
	{ name: 'Transport', icon: 'bus', budget: 600 },
	{ name: 'Eating out', icon: 'tools-kitchen-2', budget: 1000 },
	{ name: 'Hobby', icon: 'puzzle', budget: 400 },
	{ name: 'Everything else', icon: 'box', budget: 0 }
]

/* Items per category, so a Groceries order is not full of monitors. Prices are a starting
   shape; each order rescales its own basket onto the total it was given. */
const ITEMS = {
	'Groceries': [['Rugbrød', 24.95], ['Mælk, 1 l', 12.5], ['Kaffe, 500 g', 64.95], ['Æg, 10 stk.', 32.95],
		['Kylling, hel', 74.5], ['Ost, 400 g', 48.95], ['Bananer, 1 kg', 18.95], ['Pasta, 500 g', 14.5]],
	'Electronics': [['USB-C kabel, 2 m', 129], ['Powerbank 20.000 mAh', 349], ['Trådløse høretelefoner', 899],
		['SSD 1 TB', 749], ['HDMI-kabel', 99], ['Router, mesh', 1299]],
	'Household': [['Opvasketabs, 60 stk.', 89.95], ['Vaskepulver, 2 kg', 74.95], ['Køkkenrulle, 4 stk.', 34.95],
		['Affaldsposer', 29.95], ['Glødepærer, 3 stk.', 59]],
	'Home office': [['Skrivebordslampe', 449], ['Tastatur, mekanisk', 899], ['Mus, trådløs', 349],
		['Skærmarm', 599], ['Kabelbakke', 199]],
	'Clothing': [['T-shirt, basic', 149], ['Jeans', 499], ['Strømper, 5-pak', 129], ['Jakke, let', 899],
		['Sneakers', 749]],
	'Health': [['Tandpasta', 22.95], ['Shampoo, 500 ml', 89.95], ['Håndsæbe, refill', 24.95],
		['Solcreme faktor 30', 179], ['Vitaminer, 90 stk.', 129]],
	'Transport': [['Buskort, måned', 480], ['Cykelslange', 79], ['Benzin', 520], ['Parkering', 45]],
	'Eating out': [['Frokost', 129], ['Kaffe og kage', 78], ['Take-away, aften', 245], ['Middag, to personer', 590]],
	'Hobby': [['Garn, 4 nøgler', 189], ['Bog', 249], ['Brætspil', 399], ['Plantejord, 20 l', 69]],
	'Everything else': [['Gavekort', 300], ['Blomster', 145], ['Fødselsdagsgave', 399], ['Porto', 45]]
}

/* Two are archived, or the filter has nothing to show. `back` is days ago; the prices are what
   a shop asks and reach no total in the app. */
const BOOKMARKS = [
	{ name: 'Sony WH-1000XM5', url: 'https://www.proshop.dk/hoeretelefoner/sony-wh-1000xm5', price: 2799,
		categories: ['Electronics'], back: 3 },
	{ name: 'Robotstøvsuger', url: 'https://www.elgiganten.dk/robotstoevsuger', price: 3499,
		categories: ['Household'], back: 11 },
	{ name: 'Løbesko, str. 42', url: 'https://www.zalando.dk/loebesko', price: 899,
		categories: ['Clothing', 'Hobby'], back: 24 },
	{ name: 'Espressokværn', url: 'https://www.coop.dk/espressokvaern', price: 1495,
		categories: ['Household', 'Hobby'], back: 40 },
	{ name: 'Skrivebordsstol', url: 'https://www.jysk.dk/kontorstol', price: 1999,
		categories: ['Home office'], back: 62, archived: 1 },
	{ name: 'Rejsekuffert', url: 'https://www.bilka.dk/kuffert', price: null,
		categories: [], back: 95, archived: 1 }
]

const STATUSES = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Ordered', 'Returned']
const KINDS = ['Expense', 'Expense', 'Expense', 'Expense', 'Gift', 'Work', 'Sold']

const round2 = n => Math.round(n * 100) / 100
const iso = d => d.toISOString().slice(0, 10)
const toEpoch = s => Math.floor(Date.parse(s + 'T00:00:00Z') / 1000)

const insertVendor = db.prepare(`INSERT INTO vendors (id, user_id, name, initials, colour, favourite, lead)
	VALUES (@id, @userId, @name, @initials, @colour, @favourite, @lead)`)
const insertCategory = db.prepare(`INSERT INTO categories (id, user_id, name, icon, icon_path, colour, budget, favourite)
	VALUES (@id, @userId, @name, @icon, NULL, @colour, @budget, @favourite)`)
const insertOrder = db.prepare(`INSERT INTO orders
	(id, user_id, vendor_id, date, status, kind, shipping, note, reference, refunded)
	VALUES (@id, @userId, @vendorId, @date, @status, @kind, @shipping, '', @reference, 0)`)
const insertOrderCategory = db.prepare('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)')
const insertOrderStatus = db.prepare('INSERT INTO order_status_history (id, order_id, status, date) VALUES (?, ?, ?, ?)')
const insertOrderItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
	VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, NULL)`)
const insertBookmark = db.prepare(`INSERT INTO bookmarks (id, user_id, name, url, price, archived, created_at)
	VALUES (@id, @userId, @name, @url, @price, @archived, @createdAt)`)
const insertBookmarkCategory = db.prepare('INSERT INTO bookmark_categories (bookmark_id, category_id) VALUES (?, ?)')
// orders per commit: each commit rewrites every index page its random ids touched, so small batches are slow
const BATCH = 5000

// every stored column on one batch's orders, from the rows underneath; by id alone, as a user_id
// filter walks the whole account's orders once per batch
const storeColumns = db.prepare(`UPDATE orders SET
		(item_count, paid, retail) = (
			SELECT COUNT(*), COALESCE(SUM(price * quantity), 0),
				COALESCE(SUM(MAX(COALESCE(retail, price), price) * quantity), 0)
			FROM order_items WHERE order_id = orders.id),
		search_text = note || char(10) ||
			COALESCE((SELECT group_concat(title, char(10)) FROM order_items WHERE order_id = orders.id), ''),
		category_count = (SELECT COUNT(*) FROM order_categories oc WHERE oc.order_id = orders.id),
		status_type = COALESCE(
			(SELECT s.type FROM statuses s WHERE s.user_id = orders.user_id AND s.key = orders.status), 'custom')
	WHERE id IN (SELECT value FROM json_each(?))`)
const addCategoryOrders = db.prepare('UPDATE categories SET order_count = order_count + ? WHERE id = ?')
const addVendorOrders = db.prepare('UPDATE vendors SET order_count = order_count + ? WHERE id = ?')

/** Adds one to `counts` for each of `ids`. */
const tally = (counts, ids) => { for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1) }

/** Populates one account with `months` months of orders ending today. Deterministic for a
    given (seed, today) so two runs of the verification harness can be compared rather than
    merely eyeballed.

    The seed belongs to the caller. The default here is a fallback for a caller that has no
    opinion, not the dataset: the route behind FILL WITH DEMO DATA picks a fresh one per press,
    because a constant default meant the only caller in the app rebuilt the same year every
    time. Determinism is a property of (seed, today), not of leaving the argument off.

    `orders` is the total the whole year lands on, exactly: the months split it between them
    with some jitter, and the current month absorbs the rounding. Left off, each month rolls
    its own 28..44 as before. `today` is the reader's date, YYYY-MM-DD.

    Orders commit in batches, so a fill that fails keeps every batch before the one that
    failed. `onProgress(done, total)` hears the orders made; `onLanded(count)` the orders kept. */
export function populateDemoData(userId, { months = 12, seed = 424242, orders, today: day, onProgress, onLanded } = {}) {
	let s = seed
	const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
	const pick = arr => arr[Math.floor(rnd() * arr.length)]

	/* Every trigger the fill would fire per row is off while a batch is written -- the
	   item-totals set, the orders search_text and status_type pairs, the order_categories count pair, the
	   category and vendor order counts -- and the batch's stored columns and counts are written once before they come back. A statement that
	   fires a trigger keeps a statement journal sized by what the transaction has already
	   changed, so per-row triggers make a big fill quadratic. DDL is transactional in SQLite,
	   so a failed batch restores the triggers untouched; the recreate is from sqlite_master's
	   own copy. Single connection, synchronous driver: nothing else writes while they are off. */
	const triggers = db.prepare(
		`SELECT name, sql FROM sqlite_master WHERE type = 'trigger'
		 AND tbl_name IN ('order_items', 'orders', 'order_categories')`).all()

	const { vendorIds, categoryIds } = db.transaction(() => ({
		vendorIds: VENDORS.map((v, i) => {
			const id = newId('v')
			insertVendor.run({ id, userId, name: v.name, initials: v.initials,
				colour: nthColour(i, VENDOR_PALETTE), favourite: v.favourite ?? 0, lead: v.lead ?? null })
			return { id, ...v }
		}),
		categoryIds: CATEGORIES.map((c, i) => {
			const id = newId('c')
			insertCategory.run({ id, userId, name: c.name, icon: c.icon,
				colour: nthColour(i, CATEGORY_PALETTE), budget: c.budget,
				favourite: i < 3 ? 1 : 0 })
			return { id, ...c }
		})
	}))()

	const today = day ? new Date(day + 'T00:00:00Z') : new Date()
	today.setUTCHours(0, 0, 0, 0)
	const todayEpoch = Math.floor(today.getTime() / 1000)
	let made = 0, landed = 0, reference = 1000
	let remaining = Number.isFinite(orders) && orders > 0 ? Math.floor(orders) : null
	// about a hundred progress reports however big the fill, and only when the total is known
	const total = remaining
	const every = total ? Math.max(1, Math.floor(total / 100)) : 0
	let batch = []

	const land = db.transaction(rows => {
		for (const t of triggers) db.exec(`DROP TRIGGER ${t.name}`)
		for (const { order, statuses, categories, items } of rows) {
			insertOrder.run(order)
			for (const status of statuses) insertOrderStatus.run(...status)
			for (const category of categories) insertOrderCategory.run(order.id, category)
			for (const item of items) insertOrderItem.run(item)
		}
		storeColumns.run(JSON.stringify(rows.map(r => r.order.id)))
		const byCategory = new Map(), byVendor = new Map()
		for (const { order, categories } of rows) { tally(byCategory, categories); tally(byVendor, [order.vendorId]) }
		for (const [id, n] of byCategory) addCategoryOrders.run(n, id)
		for (const [id, n] of byVendor) addVendorOrders.run(n, id)
		for (const t of triggers) db.exec(t.sql)
	})
	const flush = () => {
		if (!batch.length) return
		land(batch)
		landed += batch.length
		batch = []
		if (onLanded) onLanded(landed)
	}

	for (let back = months - 1; back >= 0; back--) {
		const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1))
		const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
		// The current month only runs up to today, so its orders spread over the elapsed days
		// rather than being drawn on future ones and thrown away -- a total asked for is a
		// total delivered.
		const maxDay = back === 0 ? today.getUTCDate() : lastDay
		// An even split of what is left, jittered so the months differ; the last month takes
		// the remainder exactly. Without a total, each month rolls its own as it always has.
		const count = remaining == null ? 28 + Math.floor(rnd() * 17)   // 28..44 orders in the month
			: back === 0 ? remaining
			: Math.max(0, Math.min(remaining, Math.round((remaining / (back + 1)) * (0.85 + rnd() * 0.3))))
		if (remaining != null) remaining -= count

		for (let i = 0; i < count; i++) {
			// Spread across the month rather than clustering.
			let day = 1 + Math.floor(((i + 0.5) / count) * maxDay + (rnd() * 5 - 2.5))
			day = Math.max(1, Math.min(maxDay, day))
			const date = iso(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)))

			// Nought to four categories, each count as likely as the next; the items follow the first.
			const left = [...categoryIds]
			const chosen = Array.from({ length: Math.floor(rnd() * 5) }, () => left.splice(Math.floor(rnd() * left.length), 1)[0])
			const category = chosen[0] ?? pick(categoryIds)
			const pool = ITEMS[category.name]
			const size = 1 + Math.floor(rnd() * Math.min(5, pool.length))
			const target = 90 * Math.pow(1.16, Math.floor(rnd() * 26))     // ~90..4200 kr
			const draft = Array.from({ length: size }, () => ({ src: pick(pool), quantity: 1 + Math.floor(rnd() * 3) }))
			const rawTotal = draft.reduce((sum, d) => sum + d.src[1] * d.quantity, 0) || 1
			const scale = target / rawTotal

			const id = newId('o')
			const shipping = rnd() < 0.3 ? pick([29, 39, 49]) : 0
			const status = pick(STATUSES)
			const orderEpoch = toEpoch(date)
			const order = {
				id, userId, vendorId: pick(vendorIds).id, date: orderEpoch,
				status, kind: pick(KINDS), shipping,
				reference: String(reference++)
			}
			// A real gap, not same-day-as-ordered for every Delivered/Returned order, so the
			// timeline this seeds is one the app's own screenshots can show something on.
			const statuses = [[newId('os'), id, 'Ordered', orderEpoch]]
			if (status === 'Delivered' || status === 'Returned') {
				const deliveredEpoch = Math.min(orderEpoch + (1 + Math.floor(rnd() * 4)) * 86400, todayEpoch)
				statuses.push([newId('os'), id, 'Delivered', deliveredEpoch])
				if (status === 'Returned')
					statuses.push([newId('os'), id, 'Returned',
						Math.min(deliveredEpoch + (1 + Math.floor(rnd() * 6)) * 86400, todayEpoch)])
			}
			const categories = chosen.map(c => c.id)
			const items = draft.map(({ src, quantity }, position) => {
				const price = round2(Math.max(4, src[1] * scale))
				// Most lines were bought under retail; some at it, so "saved" is not a constant.
				const retail = rnd() < 0.78 ? round2(price * (1.05 + rnd() * 0.35)) : null
				return { id: newId('i'), orderId: id, position, title: src[0], quantity, price, retail }
			})
			batch.push({ order, statuses, categories, items })
			made++
			if (onProgress && every && made % every === 0) onProgress(made, total)
			if (batch.length === BATCH) flush()
		}
	}
	flush()

	const categoryByName = new Map(categoryIds.map(c => [c.name, c.id]))
	db.transaction(() => {
		for (const bookmark of BOOKMARKS) {
			const id = newId('bm')
			insertBookmark.run({ id, userId, name: bookmark.name, url: bookmark.url, price: bookmark.price ?? null,
				archived: bookmark.archived ?? 0, createdAt: Math.floor(today.getTime() / 1000) - bookmark.back * 86400 })
			for (const name of bookmark.categories) insertBookmarkCategory.run(id, categoryByName.get(name))
		}
	})()

	return { orders: made, vendors: vendorIds.length, categories: categoryIds.length, months, bookmarks: BOOKMARKS.length }
}
