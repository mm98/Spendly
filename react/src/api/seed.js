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
		lead: 'Your biggest vendor: 48.210 kr. across 34 orders.' },
	{ id: 'bilka',      name: 'Bilka',      initials: 'BI', colour: '#877364', orders: 96, spend: 41882, saved: 3210, favourite: true,
		lead: 'Your most frequent vendor: 96 orders, 41.882 kr.' },
	{ id: 'fotex',      name: 'Føtex',      initials: 'FØ', colour: '#877364', orders: 71, spend: 28140, saved: 1905 },
	{ id: 'elgiganten', name: 'Elgiganten', initials: 'EL', colour: '#177DA7', orders: 18, spend: 26499, saved: 4120 },
	{ id: 'matas',      name: 'Matas',      initials: 'MA', colour: '#AD620D', orders: 29, spend: 11640, saved: 1480 },
	{ id: 'zalando',    name: 'Zalando',    initials: 'ZA', colour: '#8453F5', orders: 22, spend: 9870,  saved: 2640 },
	{ id: 'jysk',       name: 'Jysk',       initials: 'JY', colour: '#235553', orders: 11, spend: 7415,  saved: 380 }
]

/* `icon` names an entry in the icon set; `colour` is the token the swatch and the tile
   both read, so a category cannot be one colour in the donut and another in the list.

   `budget` is the month's allowance. It is what the Expenses/Budget toggle switches between
   -- the prototype draws that control and changes nothing with it, which is the same defect
   as a button with no handler wearing a different shape. A budget of 0 means none is set,
   and the Budget view says so rather than reporting 0% of nothing. README: Honest Affordances. */
export const categories = [
	{ id: 'groceries',  name: 'Groceries',       icon: 'cart',    colour: 'var(--icon-red)',     spend: 18420, share: 38, saved: 1240, budget: 17000 },
	{ id: 'electronics',name: 'Electronics',     icon: 'plug',    colour: 'var(--icon-yellow)',  spend: 12940, share: 27, saved: 980,  budget: 14000 },
	{ id: 'household',  name: 'Household',       icon: 'home',    colour: 'var(--icon-purple)',  spend: 6110,  share: 13, saved: 310,  budget: 6000 },
	{ id: 'homeoffice', name: 'Home office',     icon: 'display', colour: 'var(--donut-blue)',   spend: 4880,  share: 10, saved: 505,  budget: 8000 },
	{ id: 'other',      name: 'Everything else', icon: 'tag',     colour: '#45524C',             spend: 5550,  share: 12, saved: 71,   budget: 0 }
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
	},
	/* June and May, so the period pager, the date filter and the second page of results are
	   exercised by real records rather than by an empty state. Same shape as the July ones. */
	{
		id: 'o-296', vendorId: 'fotex', date: '2026-07-12', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries'], shipping: 0, items: [
			{ id: 'i-21', title: 'Frugtkasse, blandet', quantity: 1, price: 149, retail: 179 },
			{ id: 'i-22', title: 'Rødvin, 6 flasker',   quantity: 1, price: 449, retail: 534 }
		],
		attachments: []
	},
	{
		id: 'o-295', vendorId: 'jysk', date: '2026-07-07', status: 'Ordered', kind: 'Expense',
		categoryIds: ['household'], shipping: 79, items: [
			{ id: 'i-23', title: 'Skrivebordsstol', quantity: 1, price: 1299, retail: 1499 }
		],
		attachments: []
	},
	{
		id: 'o-294', vendorId: 'proshop', date: '2026-07-03', status: 'Delivered', kind: 'Work',
		categoryIds: ['homeoffice'], shipping: 0, items: [
			{ id: 'i-24', title: 'Mekanisk tastatur', quantity: 1, price: 899, retail: 1099 },
			{ id: 'i-25', title: 'Skærmarm',          quantity: 1, price: 549, retail: 649 }
		],
		attachments: []
	},
	{
		id: 'o-293', vendorId: 'matas', date: '2026-06-27', status: 'Delivered', kind: 'Gift',
		categoryIds: ['other'], shipping: 0, items: [
			{ id: 'i-26', title: 'Gavesæt, duft', quantity: 2, price: 249, retail: 299 }
		],
		attachments: []
	},
	{
		id: 'o-292', vendorId: 'bilka', date: '2026-06-21', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries'], shipping: 0, saved: 71.5, savedPercent: 7.2,
		itemCountOverride: 19, totalOverride: 921.15, items: [
			{ id: 'i-27', title: 'Grovboller, 6 stk.', quantity: 2, price: 19.95 },
			{ id: 'i-28', title: 'Hakket oksekød',     quantity: 3, price: 42.95 }
		],
		attachments: []
	},
	{
		id: 'o-291', vendorId: 'elgiganten', date: '2026-06-14', status: 'Delivered', kind: 'Expense',
		categoryIds: ['electronics'], shipping: 0, items: [
			{ id: 'i-29', title: 'Robotstøvsuger', quantity: 1, price: 2499, retail: 2999 }
		],
		attachments: []
	},
	{
		id: 'o-290', vendorId: 'zalando', date: '2026-06-08', status: 'Delivered', kind: 'Expense',
		categoryIds: ['other'], shipping: 0, items: [
			{ id: 'i-30', title: 'Regnjakke', quantity: 1, price: 699, retail: 899 },
			{ id: 'i-31', title: 'Uldsokker, 3-pak', quantity: 2, price: 129, retail: 149 }
		],
		attachments: []
	},
	{
		id: 'o-289', vendorId: 'fotex', date: '2026-05-30', status: 'Delivered', kind: 'Expense',
		categoryIds: ['groceries', 'household'], shipping: 0, saved: 48.2, savedPercent: 6.1,
		itemCountOverride: 14, totalOverride: 742.35, items: [
			{ id: 'i-32', title: 'Vaskemiddel, 2 l', quantity: 1, price: 64.95 },
			{ id: 'i-33', title: 'Kartofler, 2 kg',  quantity: 2, price: 24.95 }
		],
		attachments: []
	}
]

/* The widths a statistics window comes in. The chips offer these and the pager steps by
   whichever one is chosen, so the list is data rather than a copy inside a component: two
   copies is how a width gets offered that nothing can page. Each one is a calendar unit --
   an ISO week, a month, the quarter, the year -- rather than a count of days back from
   today, so the pager lands on Quarter 2 and 2026 rather than on a ninety-day slice with no
   name. The three months below are the tail of Q2 and the start of Q3, so those two windows
   and the one year are as much as `all` can be cut into here.

   So each one is called what it is. The names were the prototype's durations -- 1W, 1M, 3M,
   YTD -- and only two of the four were even arithmetically true: 3M draws the quarter it
   lands in, which here is Q3, July on its own, one month of days under a chip claiming
   three, and YTD pages back to whole past years, which is not to any date. A width names a
   calendar unit or it describes a window this app does not have. The key is what the URL
   carries and the label is what the chip draws, so `?range=quarter` says which window it
   opens without a legend. */
export const ranges = [
	{ key: 'week', label: 'Week' },
	{ key: 'month', label: 'Month' },
	{ key: 'quarter', label: 'Quarter' },
	{ key: 'year', label: 'Year' },
	{ key: 'all', label: 'All' }
]

/* The month the prototype holds. Every "this month" figure on every page reads from here,
   so July cannot be 24.418,57 on Home and something else on Statistics.

   Two more months sit under it in `periods`. They exist because Statistics has a pager, and
   a pager with one place to stand is a control that draws two arrows and moves nothing --
   the defect this app keeps finding. README: Honest Affordances. */
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
	   same demo series the prototype plots.

	   `statsCurrent` is the one exception, and it is why it has no `statsPrevious` beside it
	   any more. Statistics reads it as the shape of the month's cumulative spend and scales
	   it by `spent` above, so a window narrower than a month knows what a day cost and every
	   window inside July still sums to July. The dashed comparison line used to be June drawn
	   on July's chart and authored by hand; it is now the window before this one, derived the
	   same way from the same numbers -- which is what puts both lines on one scale and gives
	   a week something to be compared against. */
	series: {
		orders: [96, 92, 98, 78, 90, 84, 96, 70, 84, 76, 92, 88, 96, 60, 74, 66, 88, 80, 72, 94, 84, 52, 26, 60, 84, 92, 68, 44, 62, 34, 56, 48, 58, 50, 54],
		saved:  [118, 120, 116, 110, 119, 114, 121, 104, 117, 112, 120, 118, 122, 98, 113, 106, 119, 115, 109, 121, 116, 92, 74, 108, 118, 121, 110, 88, 105, 80, 102, 96, 107, 99, 103],
		cumulative: [96, 78, 58, 46, 32, 18, 8],
		savingsGrowth: [84, 70, 48, 22, 12],
		monthCurrent: [226, 196, 160, 128, 88, 60, 36, 16],
		monthPrevious: [216, 198, 178, 156, 138, 122, 108],
		statsCurrent: [180, 178, 175, 173, 168, 165, 161, 159, 152, 148, 143, 140, 137, 135, 127, 121, 114, 111, 106, 100, 97, 93, 84, 71, 63, 59, 56, 50, 39, 32, 20]
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
   The draft below it is the same Bilka purchase in every case. README: Scan Flow. */
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

export const onboarding = { done: 1, total: 3 }

/* June and May, in the same shape July is in. Shorter series are fine -- the chart maps
   whatever it is given onto the element's pixel box. */
const june = {
	id: '2026-06', label: 'June 2026', shortLabel: 'June', previousLabel: 'May',
	spent: 20680, saved: 1897, savedPercent: 8.4, retail: 22577,
	orderCount: 19, averageOrder: 1088, shipping: 413, shippingShare: 2.0,
	daysIn: 30, projected: 20680, previousTotal: 18420,
	deltaLabel: '12% up vs May',
	callout: 'A steady month. The Elgiganten robot vacuum on the 14th was the biggest single order.',
	weekendShare: 29, busiestDay: 'Saturday', busiestDaySpend: 4980,
	series: {
		orders: [78, 84, 72, 90, 66, 80, 74, 88, 62, 76, 84, 70, 92, 58, 72, 80, 66, 86, 74, 60, 82, 68, 78, 64, 88, 70, 76, 62, 84, 72],
		saved: [104, 110, 98, 116, 92, 106, 100, 114, 88, 102, 110, 96, 118, 84, 98, 106, 92, 112, 100, 86, 108, 94, 104, 90, 114, 96, 102, 88, 110, 98],
		cumulative: [92, 74, 60, 44, 30, 20, 12],
		savingsGrowth: [80, 66, 46, 26, 14],
		monthCurrent: [220, 190, 158, 126, 92, 66, 40, 22],
		monthPrevious: [214, 196, 176, 154, 136, 120, 106],
		statsCurrent: [182, 179, 176, 172, 169, 164, 160, 157, 150, 146, 141, 138, 134, 131, 124, 118, 112, 108, 103, 98, 94, 90, 82, 74, 68, 62, 58, 52, 44, 36]
	},
	weekdays: [
		{ day: 'Mon', home: 44, stats: 38 }, { day: 'Tue', home: 38, stats: 32 },
		{ day: 'Wed', home: 52, stats: 44 }, { day: 'Thu', home: 40, stats: 34 },
		{ day: 'Fri', home: 46, stats: 40 }, { day: 'Sat', home: 78, stats: 66, peak: true },
		{ day: 'Sun', home: 58, stats: 48 }
	],
	months: [
		{ label: 'Jan', height: 52 }, { label: 'Feb', height: 48 }, { label: 'Mar', height: 69 },
		{ label: 'Apr', height: 43 }, { label: 'May', height: 82 }, { label: 'Jun', height: 100, current: true }
	],
	kpis: [
		{ label: 'Orders', value: '19', delta: '6% up vs May', trend: 'up', tone: 'neutral', note: 'May: 18 orders' },
		{ label: 'Average order', value: '1.088 kr.', delta: '6% up vs May', trend: 'up', tone: 'neutral', note: 'May: 1.023 kr.' },
		{ label: 'Saved vs retail', value: '1.897 kr.', delta: '3% down vs May', trend: 'down', tone: 'neutral', note: '8% under retail prices' },
		{ label: 'Shipping', value: '413 kr.', delta: '9% up vs May', trend: 'up', tone: 'neutral', note: '2,0% of spend' }
	],
	heroLegend: [
		{ name: 'Groceries', amount: 15180, colour: 'var(--green)' },
		{ name: 'Electronics', amount: 3420, colour: 'var(--teal)' },
		{ name: 'Everything else', amount: 2080, colour: '#45524C' }
	],
	statsLegend: [
		{ name: 'Groceries', amount: 15180, colour: 'var(--donut-blue)' },
		{ name: 'Electronics', amount: 3420, colour: 'var(--green)' },
		{ name: 'Household', amount: 1420, colour: 'var(--donut-yellow)' },
		{ name: 'Everything else', amount: 660, colour: 'var(--donut-purple)' }
	],
	returnsNote: 'One return in June: Jysk lampe, refunded 349,00 kr. on the 19th.'
}

const may = {
	id: '2026-05', label: 'May 2026', shortLabel: 'May', previousLabel: 'April',
	spent: 18420, saved: 1954, savedPercent: 9.6, retail: 20374,
	orderCount: 18, averageOrder: 1023, shipping: 379, shippingShare: 2.1,
	daysIn: 31, projected: 18420, previousTotal: 15960,
	deltaLabel: '15% up vs April',
	callout: 'Spring cleaning: five of the eighteen orders were Household.',
	weekendShare: 41, busiestDay: 'Sunday', busiestDaySpend: 5240,
	series: {
		orders: [70, 76, 64, 82, 60, 74, 68, 80, 58, 70, 78, 66, 84, 54, 68, 74, 62, 80, 70, 56, 76, 64, 72, 60, 82, 66, 70, 58, 78, 66, 72],
		saved: [96, 102, 90, 108, 86, 98, 92, 106, 82, 96, 102, 88, 110, 78, 92, 98, 86, 104, 94, 80, 100, 88, 96, 84, 106, 90, 94, 82, 102, 90, 96],
		cumulative: [94, 78, 64, 48, 34, 22, 14],
		savingsGrowth: [82, 68, 50, 28, 16],
		monthCurrent: [222, 194, 164, 134, 100, 72, 46, 26],
		monthPrevious: [218, 200, 182, 160, 142, 126, 112],
		statsCurrent: [184, 181, 178, 175, 171, 167, 163, 160, 154, 150, 146, 142, 139, 136, 130, 124, 118, 114, 109, 104, 100, 96, 89, 82, 76, 70, 66, 60, 52, 44, 38]
	},
	weekdays: [
		{ day: 'Mon', home: 36, stats: 30 }, { day: 'Tue', home: 42, stats: 36 },
		{ day: 'Wed', home: 48, stats: 40 }, { day: 'Thu', home: 34, stats: 28 },
		{ day: 'Fri', home: 50, stats: 42 }, { day: 'Sat', home: 62, stats: 52 },
		{ day: 'Sun', home: 74, stats: 62, peak: true }
	],
	months: [
		{ label: 'Dec', height: 74 }, { label: 'Jan', height: 52 }, { label: 'Feb', height: 48 },
		{ label: 'Mar', height: 69 }, { label: 'Apr', height: 43 }, { label: 'May', height: 100, current: true }
	],
	kpis: [
		{ label: 'Orders', value: '18', delta: '5% down vs April', trend: 'down', tone: 'good', note: 'April: 19 orders' },
		{ label: 'Average order', value: '1.023 kr.', delta: '21% up vs April', trend: 'up', tone: 'neutral', note: 'April: 840 kr.' },
		{ label: 'Saved vs retail', value: '1.954 kr.', delta: '18% up vs April', trend: 'up', tone: 'good', note: '10% under retail prices' },
		{ label: 'Shipping', value: '379 kr.', delta: '4% down vs April', trend: 'down', tone: 'good', note: '2,1% of spend' }
	],
	heroLegend: [
		{ name: 'Household', amount: 8240, colour: 'var(--green)' },
		{ name: 'Groceries', amount: 7180, colour: 'var(--teal)' },
		{ name: 'Everything else', amount: 3000, colour: '#45524C' }
	],
	statsLegend: [
		{ name: 'Household', amount: 8240, colour: 'var(--donut-blue)' },
		{ name: 'Groceries', amount: 7180, colour: 'var(--green)' },
		{ name: 'Electronics', amount: 1900, colour: 'var(--donut-yellow)' },
		{ name: 'Everything else', amount: 1100, colour: 'var(--donut-purple)' }
	],
	returnsNote: 'No returns in May.'
}

/* Newest first, which is the order the pager walks. */
export const periods = [period, june, may]

/* The question of the day, and the answer it promises. A button labelled ASK SPENDLY that
   opens nothing is the decorative-control rule with an AI badge on it, so the answer is a
   record here and the button reveals it. `categoryId` and `periodId` are what make the
   answer checkable: the orders behind it are one click away. README: Honest Affordances. */
export const answers = [
	{
		id: 'groceries-june',
		question: 'What did Groceries cost me in June?',
		short: 'What did Groceries cost in June?',
		answer: '15.180 kr., across 11 of June\'s 19 orders.',
		detail: 'That is 3.240 kr. less than July so far, and 73% of everything you spent in June.',
		categoryId: 'groceries',
		periodId: '2026-06'
	}
]

/* The defaults every setting starts at. Each one is read somewhere -- a settings page whose
   switches change nothing is the same defect as a button that does nothing, one screen up. */
export const defaultSettings = {
	defaultKind: 'Expense',
	defaultStatus: 'Delivered',
	pageSize: 10,
	sort: 'date-desc',
	showScanCard: true,
	confirmDelete: true
}

/* How the All orders list can be ordered. The label is what the control prints. */
export const sorts = [
	{ id: 'date-desc', label: 'Date, newest' },
	{ id: 'date-asc', label: 'Date, oldest' },
	{ id: 'amount-desc', label: 'Amount, highest' },
	{ id: 'amount-asc', label: 'Amount, lowest' },
	{ id: 'vendor-asc', label: 'Vendor, A to Z' }
]
