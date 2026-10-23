// Types searches into the order list's search, as a person does, and checks the filters each one sets:
// amounts, periods, shops and categories in English and Danish, and categories found by meaning.
// Runs on the session's account, whose demo fill names the shops and categories below.
//   npm run search:check
//   npm run search:check -- --only=7,12   (the cases with these numbers)
// The API needs the language model (SPENDLY_MODEL_DIR) for the cases marked `meaning`.
import { openSession, BASE } from './session.mjs'

const now = new Date()
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const day = (y, m, d) => iso(new Date(y, m, d))
const [Y, M, D] = [now.getFullYear(), now.getMonth(), now.getDate()]
const monday = D - (now.getDay() + 6) % 7
const lastMonthOf = m => (m <= M ? Y : Y - 1)
const month = (y, m) => ({ from: day(y, m, 1), to: day(y, m + 1, 0) })
const PERIODS = {
	thisMonth: month(Y, M),
	lastMonth: month(Y, M - 1),
	thisYear: { from: day(Y, 0, 1), to: day(Y, 11, 31) },
	lastYear: { from: day(Y - 1, 0, 1), to: day(Y - 1, 11, 31) },
	thisWeek: { from: day(Y, M, monday), to: day(Y, M, monday + 6) },
	lastWeek: { from: day(Y, M, monday - 7), to: day(Y, M, monday - 1) },
	yesterday: { from: day(Y, M, D - 1), to: day(Y, M, D - 1) },
	last30: { from: day(Y, M, D - 29), to: iso(now) },
	sinceJune: { from: day(lastMonthOf(5), 5, 1), to: iso(now) },
	august: month(lastMonthOf(7), 7),
	august2025: month(2025, 7),
	october2025: month(2025, 9)
}

/* what each search should set: category and vendor by name, min and max, a period, and the words searched as text */
const CASES = [
	['groceries over 500 kr', { category: ['Groceries'], min: '500' }],
	['groceries greater than 500 kr', { category: ['Groceries'], min: '500' }],
	['groceries greater then 500', { category: ['Groceries'], min: '500' }],
	['food greater than 500 kr', { category: ['Groceries'], min: '500', meaning: true }],
	['electronics more than 2000', { category: ['Electronics'], min: '2000' }],
	['groceries bigger than 300', { category: ['Groceries'], min: '300' }],
	['groceries at least 250 kr', { category: ['Groceries'], min: '250' }],
	['clothing under 400', { category: ['Clothing'], max: '400' }],
	['clothing less than 400 kr', { category: ['Clothing'], max: '400' }],
	['clothing cheaper than 400', { category: ['Clothing'], max: '400' }],
	['electronics at most 1.000 kr', { category: ['Electronics'], max: '1000' }],
	['groceries between 200 and 500', { category: ['Groceries'], min: '200', max: '500' }],
	['groceries 200-500 kr', { category: ['Groceries'], min: '200', max: '500' }],
	['groceries 200 to 500', { category: ['Groceries'], min: '200', max: '500' }],
	['groceries >500', { category: ['Groceries'], min: '500' }],
	['groceries ≥ 500', { category: ['Groceries'], min: '500' }],
	['groceries <200', { category: ['Groceries'], max: '200' }],
	['groceries 500+', { category: ['Groceries'], min: '500' }],
	['500 or more', { min: '500' }],
	['200 or less', { max: '200' }],
	['dagligvarer over 500 kr', { category: ['Groceries'], min: '500', meaning: true }],
	['mere end 500 kr', { min: '500' }],
	['større end 500', { min: '500' }],
	['mindre end 300 kr', { max: '300' }],
	['billigere end 300', { max: '300' }],
	['højst 300 kr', { max: '300' }],
	['mindst 300 kr', { min: '300' }],
	['mellem 200 og 500', { min: '200', max: '500' }],
	['500 eller mere', { min: '500' }],
	['tøj under 1000 kr', { category: ['Clothing'], max: '1000', meaning: true }],
	['this month', { period: 'thisMonth' }],
	['last month', { period: 'lastMonth' }],
	['denne måned', { period: 'thisMonth' }],
	['sidste måned', { period: 'lastMonth' }],
	['i år', { period: 'thisYear' }],
	['sidste år', { period: 'lastYear' }],
	['this week', { period: 'thisWeek' }],
	['sidste uge', { period: 'lastWeek' }],
	['yesterday', { period: 'yesterday' }],
	['i går', { period: 'yesterday' }],
	['last 30 days', { period: 'last30' }],
	['since june', { period: 'sinceJune' }],
	['august 2025', { period: 'august2025' }],
	['i august', { period: 'august' }],
	['oktober 2025', { period: 'october2025' }],
	['netto over 500 last month', { vendor: ['Netto'], min: '500', period: 'lastMonth' }],
	['fra bilka i august', { vendor: ['Bilka'], period: 'august' }],
	['orders over 500 from netto this year', { vendor: ['Netto'], min: '500', period: 'thisYear' }],
	['hos netto sidste måned', { vendor: ['Netto'], period: 'lastMonth' }],
	['ikea under 2000', { vendor: ['IKEA'], max: '2000' }],
	['medicin', { category: ['Health'], meaning: true }],
	['groceries or electronics', { category: ['Electronics', 'Groceries'] }],
	['groceries lamp', { category: ['Groceries'], text: 'lamp' }],
	['headphones', { text: 'headphones' }]
]

const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',').map(Number)
const { browser, desktop } = await openSession()
const page = await desktop.newPage()
page.setDefaultTimeout(2000)
page.setDefaultNavigationTimeout(2000)

// the names the server gave for typed words, and the order list's last request for rows
const names = new Map()
let asked = null
page.on('response', async r => {
	if (!r.url().includes('/api/search/names')) return
	for (const n of (await r.json().catch(() => null))?.names ?? []) names.set(n.id, n.name)
})
page.on('request', r => {
	if (r.url().includes('/api/orders?') && r.url().includes('with=rows')) asked = new URLSearchParams(r.url().split('?')[1])
})

const field = page.locator('[data-page-search="orders"]')
const crumbs = () => page.locator('.sp-crumb__label').allInnerTexts()

/** What the list asked for once the typed text has settled: the same request and crumbs for a moment. */
async function settled() {
	let last = ''
	let since = Date.now()
	const until = Date.now() + 6000
	while (Date.now() < until) {
		const seen = `${asked}|${(await crumbs()).join('|')}`
		if (seen !== last) { last = seen; since = Date.now() }
		else if (Date.now() - since > 800) return asked
		await page.waitForTimeout(100)
	}
	return asked
}

const listed = (ids, kind) => (ids ? ids.split(',').map(id => names.get(id) ?? `${kind} ${id}`).sort() : [])

let failed = 0
let run = 0
for (const [i, [typed, want]] of CASES.entries()) {
	const number = i + 1
	if (only && !only.includes(number)) continue
	run++
	// a fresh page each time, so no answer is reused from the search before
	await page.goto(`${BASE}/#/orders`)
	await page.reload()
	await field.waitFor()
	asked = null
	await field.click()
	await field.pressSequentially(typed, { delay: 30 })
	const got = await settled()
	const period = want.period ? PERIODS[want.period] : { from: '', to: '' }
	const expected = {
		category: (want.category ?? []).slice().sort(), vendor: (want.vendor ?? []).slice().sort(),
		min: want.min ?? '', max: want.max ?? '', from: period.from, to: period.to, text: want.text ?? ''
	}
	const actual = {
		category: listed(got?.get('categoryId'), 'category'), vendor: listed(got?.get('vendorId'), 'vendor'),
		min: got?.get('minAmount') ?? '', max: got?.get('maxAmount') ?? '', from: got?.get('from') ?? '', to: got?.get('to') ?? '',
		text: got?.get('query') ?? ''
	}
	const same = JSON.stringify(actual) === JSON.stringify(expected)
	if (!same) failed++
	console.log(`${same ? 'ok  ' : 'FAIL'} ${String(number).padStart(2)} ${JSON.stringify(typed)}${want.meaning ? ' (meaning)' : ''}`)
	if (!same) console.log(`       wanted ${JSON.stringify(expected)}\n       got    ${JSON.stringify(actual)}  crumbs ${JSON.stringify(await crumbs())}`)
}
console.log(`\n${run - failed} of ${run} searches set the filters they should.`)
await browser.close()
process.exit(failed ? 1 : 0)
