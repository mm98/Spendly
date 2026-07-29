/* The phantom data source.

   Every figure the prototype prints is here as a number or a record, so the pages read
   from one place instead of carrying their own copy in markup. The values are the
   prototype's own -- demo data, like every figure in that file -- and the point of moving
   them here is that a change to a total now changes it everywhere it is shown, which is
   the thing thirteen pages of hand-written markup could not promise.

   Nothing in this module talks to a network. client.js wraps it in the shape a real API
   would have (async, latency, errors, mutation), so the pages are written against that
   shape and swapping in fetch() later touches client.js and nothing else. */

export const vendors = [
	{ id: 'proshop',    name: 'Proshop',    initials: 'PR', colour: '#235553', orders: 34, spend: 48210, saved: 6940, favourite: true,
		lead: 'Your biggest vendor: 48.210 kr. across 34 orders.', latest: { date: '2026-07-24', items: 4, total: 612 } },
	{ id: 'bilka',      name: 'Bilka',      initials: 'BI', colour: '#877364', orders: 96, spend: 41882, saved: 3210, favourite: true,
		lead: 'Your most frequent vendor: 96 orders, 41.882 kr.', latest: { date: '2026-07-18', items: 23, total: 146.1 } },
	{ id: 'fotex',      name: 'Føtex',      initials: 'FØ', colour: '#877364', orders: 71, spend: 28140, saved: 1905 },
	{ id: 'elgiganten', name: 'Elgiganten', initials: 'EL', colour: '#177DA7', orders: 18, spend: 26499, saved: 4120 },
	{ id: 'matas',      name: 'Matas',      initials: 'MA', colour: '#AD620D', orders: 29, spend: 11640, saved: 1480 },
	{ id: 'zalando',    name: 'Zalando',    initials: 'ZA', colour: '#8453F5', orders: 22, spend: 9870,  saved: 2640 },
	{ id: 'jysk',       name: 'Jysk',       initials: 'JY', colour: '#235553', orders: 11, spend: 7415,  saved: 380 }
]

/* `icon` names an entry in the icon set; `colour` is the token the swatch and the tile
   both read, so a category cannot be one colour in the donut and another in the list. */
export const categories = [
	{ id: 'groceries',  name: 'Groceries',       icon: 'cart',    colour: 'var(--icon-red)',     spend: 18420, share: 38, saved: 1240 },
	{ id: 'electronics',name: 'Electronics',     icon: 'plug',    colour: 'var(--icon-yellow)',  spend: 12940, share: 27, saved: 980 },
	{ id: 'household',  name: 'Household',       icon: 'home',    colour: 'var(--icon-purple)',  spend: 6110,  share: 13, saved: 310 },
	{ id: 'homeoffice', name: 'Home office',     icon: 'display', colour: 'var(--donut-blue)',   spend: 4880,  share: 10, saved: 505 },
	{ id: 'other',      name: 'Everything else', icon: 'tag',     colour: '#45524C',             spend: 5550,  share: 12, saved: 71 }
]

export const orders = [
	{
		id: 'o-303', vendorId: 'proshop', date: '2026-07-24', status: 'Delivered', kind: 'Expense',
		categoryIds: ['electronics', 'homeoffice'], shipping: 49,
		note: '', reference: '303',
		items: [
			{ id: 'i-1', title: 'Dell UltraSharp U2723QE 27 tommer', quantity: 1, price: 3199, retail: 3649 },
			{ id: 'i-2', title: 'Logitech MX Master 3S', quantity: 1, price: 749, retail: 849,
				note: 'Replaces the one that drowned in coffee' },
			{ id: 'i-3', title: 'USB-C dock, 6 porte', quantity: 1, price: 249, retail: 299 },
			{ id: 'i-4', title: 'Kabelbindere, 100 stk.', quantity: 2, price: 26, retail: 32 }
		],
		attachments: [{ id: 'a-1', name: 'faktura-303.pdf', kind: 'pdf', meta: 'Scanned 24 July · 214 KB' }]
	},
	{
		id: 'o-302', vendorId: 'matas', date: '2026-07-21', status: 'Delivered', kind: 'Expense',
		categoryIds: ['household'], shipping: 0, items: [
			{ id: 'i-5', title: 'Shampoo, 500 ml',    quantity: 2, price: 89.95,  retail: 104.95 },
			{ id: 'i-6', title: 'Tandpasta',          quantity: 3, price: 22.95,  retail: 26.95 },
			{ id: 'i-7', title: 'Håndsæbe, refill',   quantity: 4, price: 24.95,  retail: 26.95 },
			{ id: 'i-8', title: 'Solcreme faktor 30', quantity: 1, price: 179,    retail: 199 },
			{ id: 'i-9', title: 'Vitaminer, 90 stk.', quantity: 1, price: 114.95, retail: 132.95 }
		],
		attachments: []
	},
	{
		id: 'o-301', vendorId: 'bilka', date: '2026-07-18', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries'], shipping: 0, saved: 146.1, savedPercent: 11.0,
		itemCountOverride: 23, totalOverride: 1187.25, items: [
			{ id: 'i-10', title: 'Rugbrød, skiveskåret', quantity: 1, price: 24.95 },
			{ id: 'i-11', title: 'Minimælk 1 l', quantity: 4, price: 10.95 },
			{ id: 'i-12', title: 'Kaffe, formalet 400 g', quantity: 1, price: 54.95 },
			{ id: 'i-13', title: 'Smør, 250 g', quantity: 1, price: 21.95 }
		],
		attachments: [{ id: 'a-2', name: 'kvittering-bilka.jpg', kind: 'image', meta: 'Scanned 18 July · 2,1 MB' }]
	},
	{
		id: 'o-300', vendorId: 'elgiganten', date: '2026-07-15', status: 'Delivered', kind: 'Expense',
		categoryIds: ['electronics'], shipping: 0, items: [
			{ id: 'i-14', title: 'Sonos Era 100', quantity: 1, price: 1799, retail: 2199 },
			{ id: 'i-15', title: 'HDMI 2.1 kabel, 2 m', quantity: 2, price: 149, retail: 199 }
		],
		attachments: []
	},
	{
		id: 'o-299', vendorId: 'bilka', date: '2026-07-09', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries', 'household'], shipping: 0, saved: 62.25, savedPercent: 6.5,
		itemCountOverride: 16, totalOverride: 894.4, items: [
			{ id: 'i-16', title: 'Kyllingebryst, 700 g', quantity: 1, price: 74.95 },
			{ id: 'i-17', title: 'Æg, 10 stk.', quantity: 2, price: 32.95 }
		],
		attachments: []
	},
	{
		id: 'o-298', vendorId: 'bilka', date: '2026-07-02', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries'], shipping: 0, saved: 41, savedPercent: 6.0,
		itemCountOverride: 9, totalOverride: 640.8, items: [
			{ id: 'i-18', title: 'Havregryn, 1 kg', quantity: 2, price: 18.95 },
			{ id: 'i-19', title: 'Bananer, 1 kg', quantity: 1, price: 22.95 }
		],
		attachments: []
	},
	{
		id: 'o-297', vendorId: 'zalando', date: '2026-07-05', status: 'Returned', kind: 'Expense',
		categoryIds: ['other'], shipping: 0,
		totalOverride: 799, refunded: true, items: [
			{ id: 'i-20', title: 'Løbesko, str. 43', quantity: 1, price: 799 }
		],
		attachments: []
	}
]

/* The month the prototype holds. Every "this month" figure on every page reads from here,
   so July cannot be 24.418,57 on Home and something else on Statistics. */
export const period = {
	id: '2026-07',
	label: 'July 2026',
	shortLabel: 'July',
	previousLabel: 'June',
	spent: 24418.57,
	saved: 2106,
	savedPercent: 9.4,
	retail: 26524,
	orderCount: 23,
	averageOrder: 1062,
	shipping: 388,
	shippingShare: 1.6,
	daysIn: 25,
	projected: 30300,
	previousTotal: 20680,
	deltaLabel: '18% up vs June',
	callout: 'Quiet week so far. Biggest day was the 23rd: 4.298,00 kr. at Proshop.',
	weekendShare: 34,
	busiestDay: 'Sunday',
	busiestDaySpend: 6410,
	/* Daily spend through July, and the savings that shadow it. The chart module maps one
	   user unit onto one CSS pixel, so these are y-coordinates rather than kroner -- the
	   same demo series the prototype plots. */
	series: {
		orders: [96, 92, 98, 78, 90, 84, 96, 70, 84, 76, 92, 88, 96, 60, 74, 66, 88, 80, 72, 94, 84, 52, 26, 60, 84, 92, 68, 44, 62, 34, 56, 48, 58, 50, 54],
		saved:  [118, 120, 116, 110, 119, 114, 121, 104, 117, 112, 120, 118, 122, 98, 113, 106, 119, 115, 109, 121, 116, 92, 74, 108, 118, 121, 110, 88, 105, 80, 102, 96, 107, 99, 103],
		cumulative: [96, 78, 58, 46, 32, 18, 8],
		savingsGrowth: [84, 70, 48, 22, 12],
		monthCurrent: [226, 196, 160, 128, 88, 60, 36, 16],
		monthPrevious: [216, 198, 178, 156, 138, 122, 108],
		statsCurrent: [180, 178, 175, 173, 168, 165, 161, 159, 152, 148, 143, 140, 137, 135, 127, 121, 114, 111, 106, 100, 97, 93, 84, 71, 63, 59, 56, 50, 39, 32, 20],
		statsPrevious: [186, 184, 183, 178, 175, 172, 170, 167, 164, 162, 160, 155, 148, 143, 141, 139, 136, 130, 126, 119, 114, 109, 104, 99, 94, 93, 92, 91, 88, 86]
	},
	/* Bar heights in px, as authored. Wednesday and Sunday carry the highlight. */
	weekdays: [
		{ day: 'Mon', home: 40, stats: 34 },
		{ day: 'Tue', home: 56, stats: 46 },
		{ day: 'Wed', home: 70, stats: 58, peak: true },
		{ day: 'Thu', home: 31, stats: 28 },
		{ day: 'Fri', home: 36, stats: 32 },
		{ day: 'Sat', home: 47, stats: 44 },
		{ day: 'Sun', home: 84, stats: 70, peak: true }
	],
	months: [
		{ label: 'Feb', height: 48 }, { label: 'Mar', height: 69 }, { label: 'Apr', height: 43 },
		{ label: 'May', height: 82 }, { label: 'Jun', height: 85 }, { label: 'Jul', height: 100, current: true }
	],
	kpis: [
		{ label: 'Orders',         value: '23',        delta: '21% up vs June', trend: 'up',   tone: 'neutral', note: 'June: 19 orders' },
		{ label: 'Average order',  value: '1.062 kr.', delta: '2% down vs June', trend: 'down', tone: 'good',    note: 'June: 1.088 kr.' },
		{ label: 'Saved vs retail',value: '2.106 kr.', delta: '11% up vs June',  trend: 'up',   tone: 'good',    note: '9% under retail prices' },
		{ label: 'Shipping',       value: '388 kr.',   delta: '6% down vs June', trend: 'down', tone: 'good',    note: '1,6% of spend' }
	],
	/* The hero legend folds the long tail into one row, so it is not the category list. */
	heroLegend: [
		{ name: 'Groceries',       amount: 18420, colour: 'var(--green)' },
		{ name: 'Electronics',     amount: 12940, colour: 'var(--teal)' },
		{ name: 'Everything else', amount: 7190,  colour: '#45524C' }
	],
	statsLegend: [
		{ name: 'Groceries',       amount: 18420, colour: 'var(--donut-blue)' },
		{ name: 'Electronics',     amount: 12940, colour: 'var(--green)' },
		{ name: 'Household',       amount: 6110,  colour: 'var(--donut-yellow)' },
		{ name: 'Everything else', amount: 5550,  colour: 'var(--donut-purple)' }
	],
	returnsNote: 'No open returns. Zalando was returned on 5 July and refunded in full: 799,00 kr.'
}

/* Which cards the dashboard can hold. `on` is the shipped default; the user's own order
   is stored by client.js and wins over it. */
export const dashboardCards = [
	{ key: 'rhythm',    name: 'Spending rhythm',      desc: 'Average order, and which weekday you spend on', on: true },
	{ key: 'breakdown', name: 'Category breakdown',   desc: "Where this month's spend went, by category",    on: true },
	{ key: 'vendors',   name: 'Top vendors',          desc: 'The shops you spend the most at, all time',     on: true },
	{ key: 'favcats',   name: 'Favourite categories', desc: 'The categories you starred, with spend and savings' },
	{ key: 'saved',     name: 'Saved vs retail',      desc: 'What you paid against the retail price, this month' },
	{ key: 'pace',      name: 'Monthly pace',         desc: 'Where July lands if the rest of the month looks like the start' }
]

/* The scan page offers four ways in and the hero says "a PDF, photo or screenshot", so
   the two steps after it render the document that was chosen rather than a fixed photo:
   the format is the file's, and a page count belongs to the PDFs and to nothing else.
   The draft below it is the same Bilka purchase in every case. README 11. */
export const scanDocuments = {
	photo:        { kind: 'image', name: 'kvittering-bilka.jpg',        meta: 'JPEG · 2,1 MB' },
	screenshot:   { kind: 'image', name: 'ordrebekraeftelse-bilka.png', meta: 'PNG · 480 KB' },
	invoice:      { kind: 'pdf',   name: 'kvittering-bilka.pdf',        meta: 'PDF · 3 pages · 214 KB' },
	confirmation: { kind: 'pdf',   name: 'ordrebekraeftelse-bilka.pdf', meta: 'PDF · 2 pages · 96 KB' }
}

export const recentScans = [
	{ id: 's-1', name: 'kvittering-bilka.jpg', meta: '18 July · 23 items found', total: 1187.25, orderId: 'o-301' },
	{ id: 's-2', name: 'faktura-303.pdf',      meta: '24 July · 4 items found',  total: 4298,    orderId: 'o-303' }
]

/* What the reader hands back for the chosen document: the draft order, the lines it read,
   what it checked, and the order it thinks might be a duplicate. */
export const scanDraft = {
	vendor: 'Bilka',
	vendorMatched: true,
	date: '2026-07-18',
	status: 'Delivered',
	kind: 'Expense',
	shipping: 0,
	linesRead: 23,
	subtotal: 1187.25,
	total: 1187.25,
	reconciled: 'The document total 1.187,25 kr. includes 25% VAT and agrees with the 23 lines read.',
	lines: [
		{ id: 'l-1', title: 'Rugbrød, skiveskåret',  quantity: 1, price: 24.95 },
		{ id: 'l-2', title: 'Minimælk 1 l',          quantity: 4, price: 10.95 },
		{ id: 'l-3', title: 'Kaffe, formalet 400 g', quantity: 1, price: 54.95 },
		{ id: 'l-4', title: 'Line 14 was hard to read', uncertain: true, amount: 21.95,
			meta: 'Guessed: Smør, 250 g · 1 × 21,95 kr.' }
	],
	remainder: { count: 19, total: 1041.6 },
	checks: [
		{ id: 'c-1', title: 'Totals reconciled', meta: 'Document total incl. 25% VAT anchors the draft.' },
		{ id: 'c-2', title: 'Vendor matched',    meta: 'Bilka, from your vendor list.' },
		{ id: 'c-3', title: '1 line uncertain',  meta: 'Line 14 is flagged above for review.', warning: true }
	],
	duplicate: { orderId: 'o-299', title: 'Bilka · 16 July', meta: '23 items · could be a second trip', total: 894.4 }
}

/* The draft the New order flow opens on. A prototype with an empty form on step 1 cannot
   show what a filled one looks like, and this is the purchase step 2 then itemises. */
export const orderDraft = {
	vendor: 'Matas',
	date: '2026-07-25',
	status: 'Delivered',
	categories: ['Household', 'Groceries'],
	kind: 'Expense',
	shipping: '',
	reference: '',
	note: '',
	items: [
		{ id: 'd-1', title: 'Shampoo, 500 ml', quantity: 2, price: 89.95, retail: 104.95 },
		{ id: 'd-2', title: 'Tandpasta',       quantity: 3, price: 22.95, retail: 26.95 }
	]
}

/* The kinds an order can be. The New order form checks against this list rather than
   against a copy of it, so a kind can be added in one place. */
export const spendKinds = ['Expense', 'Gift', 'Sold', 'Work', 'Other']

export const promos = [
	{ id: 'p-1', tag: 'Quick wins', tagIcon: 'bolt', tone: 'pink', title: 'Name that vendor',
		body: '3 orders have unmatched vendor names. Confirm them to keep totals clean.' },
	{ id: 'p-2', tag: 'AI scan', tagIcon: 'sparkles', tone: 'blue', title: 'Forward email receipts',
		body: 'Screenshots of order emails scan just as well as paper receipts.' },
	{ id: 'p-3', tag: 'Quick wins', tagIcon: 'bolt', tone: 'pink', title: 'Mark deliveries',
		body: '1 order is still marked ordered after ten days. Check if it arrived.' }
]

export const questionOfTheDay = {
	long: 'What did Groceries cost me in June?',
	short: 'What did Groceries cost in June?'
}

/* What the global finder answers with. A live index over orders, vendors and notes is
   more than a phantom source needs to promise, so the one query the prototype shows is
   the one this returns -- and client.js says so by only matching that prefix. */
export const finderResults = {
	bil: {
		groups: [
			{ heading: 'Orders', options: [
				{ id: 'f-1', mark: 'Bil', rest: 'ka · 18 July', meta: '1.187,25 kr.', to: '/orders/o-301' },
				{ id: 'f-2', mark: 'Bil', rest: 'ka · 9 July',  meta: '894,40 kr.',   to: '/orders/o-299' }
			] },
			{ heading: 'Vendors', options: [
				{ id: 'f-3', mark: 'Bil', rest: 'ka', meta: '96 orders · 41.882 kr.', to: '/vendors' }
			] },
			{ heading: 'Notes', options: [
				{ id: 'f-4', before: '"…reservedele til ', mark: 'bil', rest: 'en"', meta: 'Silvan · 2 July', to: '/orders/o-298' }
			] }
		]
	}
}

export const onboarding = { done: 1, total: 3 }
