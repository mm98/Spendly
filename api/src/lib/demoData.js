import { db } from '../db.js'
import { newId } from './ids.js'
import { CATEGORY_PALETTE, VENDOR_PALETTE, nthColour } from './palette.js'

/* A year of plausible ledger, for looking at the app with something in it.

   This is not the demo data a new account used to be seeded with -- that was dropped in
   df597f3 because an account that registers and immediately shows somebody's shopping reads
   as a data leak. This is the opposite: nothing arrives unasked, and a signed-in user presses
   a button to fill their own account. The two are the same rows and completely different
   promises.

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
	{ name: 'Groceries', icon: 'cart', budget: 4500 },
	{ name: 'Electronics', icon: 'plug', budget: 1800 },
	{ name: 'Household', icon: 'home', budget: 900 },
	{ name: 'Home office', icon: 'display', budget: 700 },
	{ name: 'Clothing', icon: 'tag', budget: 800 },
	{ name: 'Health', icon: 'tag', budget: 500 },
	{ name: 'Transport', icon: 'tag', budget: 600 },
	{ name: 'Eating out', icon: 'tag', budget: 1000 },
	{ name: 'Hobby', icon: 'tag', budget: 400 },
	{ name: 'Everything else', icon: 'tag', budget: 0 }
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
const insertOrderItem = db.prepare(`INSERT INTO order_items (id, order_id, position, title, quantity, price, retail, note)
	VALUES (@id, @orderId, @position, @title, @quantity, @price, @retail, NULL)`)

/** Populates one account with `months` months of orders ending today. Deterministic for a
    given (seed, today) so two runs of the verification harness can be compared rather than
    merely eyeballed. Runs in one transaction: a half-written year is worse than none. */
export const populateDemoData = db.transaction((userId, { months = 12, seed = 424242 } = {}) => {
	let s = seed
	const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
	const pick = arr => arr[Math.floor(rnd() * arr.length)]

	const vendorIds = VENDORS.map((v, i) => {
		const id = newId('v')
		insertVendor.run({ id, userId, name: v.name, initials: v.initials,
			colour: nthColour(i, VENDOR_PALETTE), favourite: v.favourite ?? 0, lead: v.lead ?? null })
		return { id, ...v }
	})
	const categoryIds = CATEGORIES.map((c, i) => {
		const id = newId('c')
		insertCategory.run({ id, userId, name: c.name, icon: c.icon,
			colour: nthColour(i, CATEGORY_PALETTE), budget: c.budget,
			favourite: i < 3 ? 1 : 0 })
		return { id, ...c }
	})

	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)
	const todayStr = iso(today)
	let made = 0, reference = 1000

	for (let back = months - 1; back >= 0; back--) {
		const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1))
		const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
		const count = 14 + Math.floor(rnd() * 9)              // 14..22 orders in the month

		for (let i = 0; i < count; i++) {
			// Spread across the month rather than clustering, and never past today.
			let day = 1 + Math.floor(((i + 0.5) / count) * lastDay + (rnd() * 5 - 2.5))
			day = Math.max(1, Math.min(lastDay, day))
			const date = iso(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)))
			if (date > todayStr) continue

			const category = pick(categoryIds)
			const pool = ITEMS[category.name]
			const size = 1 + Math.floor(rnd() * Math.min(5, pool.length))
			const target = 90 * Math.pow(1.16, Math.floor(rnd() * 26))     // ~90..4200 kr
			const draft = Array.from({ length: size }, () => ({ src: pick(pool), quantity: 1 + Math.floor(rnd() * 3) }))
			const rawTotal = draft.reduce((sum, d) => sum + d.src[1] * d.quantity, 0) || 1
			const scale = target / rawTotal

			const id = newId('o')
			const shipping = rnd() < 0.3 ? pick([29, 39, 49]) : 0
			insertOrder.run({
				id, userId, vendorId: pick(vendorIds).id, date: toEpoch(date),
				status: pick(STATUSES), kind: pick(KINDS), shipping,
				reference: String(reference++)
			})
			insertOrderCategory.run(id, category.id)
			// A second category on some orders, so the breakdown has multi-category spend to split.
			if (rnd() < 0.22) {
				const other = pick(categoryIds)
				if (other.id !== category.id) insertOrderCategory.run(id, other.id)
			}
			draft.forEach(({ src, quantity }, position) => {
				const price = round2(Math.max(4, src[1] * scale))
				// Most lines were bought under retail; some at it, so "saved" is not a constant.
				const retail = rnd() < 0.78 ? round2(price * (1.05 + rnd() * 0.35)) : null
				insertOrderItem.run({ id: newId('i'), orderId: id, position,
					title: src[0], quantity, price, retail })
			})
			made++
		}
	}

	return { orders: made, vendors: vendorIds.length, categories: categoryIds.length, months }
})
