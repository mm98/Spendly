import { OFFER_DAYS, findOffers, withPictures } from './index.js'
import { pickedSourceFor } from './picks.js'

/* The offers for the lines of one order (Order editing layouts 1a): one request for every line, and for
   each line the cheapest offer that is below what the line paid. A match is a guess on the line's text. */

const LINES_MOST = 90

// "500g", "1,5 L", "33 cl": the size a line's name carries, in kilos or litres
const SIZE = /(\d+(?:[.,]\d+)?)\s*(kg|g|l|ltr|dl|cl|ml)\b\.?/i
const TO_BASE = { kg: ['kg', 1], g: ['kg', 0.001], l: ['l', 1], ltr: ['l', 1], dl: ['l', 0.1], cl: ['l', 0.01], ml: ['l', 0.001] }
// the site writes a unit as "ltr." and "kg."
const UNIT_BASE = { 'ltr.': 'l', 'l.': 'l', 'kg.': 'kg' }

export function sizeOf(title) {
	const found = String(title).match(SIZE)
	if (!found) return null
	const [unit, scale] = TO_BASE[found[2].toLowerCase()]
	const amount = Number(found[1].replace(',', '.')) * scale
	return amount > 0 ? { amount, unit } : null
}

/** The words a line is searched by: its name without sizes, counts and signs. */
export const searchWordsOf = title => String(title)
	.replace(new RegExp(SIZE.source, 'gi'), ' ')
	.replace(/\b\d+\s*(x|stk|pk|pcs)\b\.?/gi, ' ')
	.replace(/[^\p{L}\s-]/gu, ' ')
	.replace(/\s+/g, ' ')
	.trim()
	.toLowerCase()

/** The offer below what `line` paid, cheapest first, among `offers` that hold on `date`; or null.
    Per kilo or litre when both the line's name and the offer give it, else per piece. */
export function matchFor(line, offers, date) {
	const price = Number(line.price)
	if (!(price > 0)) return null
	const size = sizeOf(line.title)
	const priced = offers
		.filter(o => o.price > 0 && o.from && o.to && o.from <= date && date <= o.to)
		.map(o => {
			const unit = UNIT_BASE[o.perUnit?.unit]
			const perUnit = size && unit === size.unit && o.perUnit.price > 0
			return {
				offer: o,
				paid: perUnit ? price / size.amount : price,
				costs: perUnit ? o.perUnit.price : o.price / o.forHowMany
			}
		})
		.filter(p => p.costs < p.paid)
		.sort((a, b) => a.costs / a.paid - b.costs / b.paid)
	return priced[0]?.offer ?? null
}

/** Whether an order of `vendorId` and `categoryIds`, dated `date`, may show offers on `today`, and from which source. */
export function offerSourceForOrder({ userId, today, vendorId, categoryIds, date }) {
	if (!date || !today || date > today) return null
	const first = new Date(`${today}T00:00:00Z`)
	first.setUTCDate(first.getUTCDate() - (OFFER_DAYS - 1))
	if (date < first.toISOString().slice(0, 10)) return null
	return pickedSourceFor(userId, { vendorId, categoryIds })
}

/** { shown: false }, or { shown, source, state, lines: [{ index, offer }] }; state is `unchecked` (nothing
    kept to read), `checked`, `failed`, or `wait` with `waitMinutes` or `perDay`. */
export async function offersForOrder({ userId, today, vendorId, categoryIds, date, lines, keptOnly }, signal) {
	const source = offerSourceForOrder({ userId, today, vendorId, categoryIds, date })
	if (!source) return { shown: false }
	const named = { name: source.name, site: source.site }
	const searched = lines.slice(0, LINES_MOST).map((line, index) => ({ line, index, words: searchWordsOf(line.title) })).filter(l => l.words)
	if (!searched.length) return { shown: true, source: named, state: 'checked', lines: [] }
	const answer = await findOffers(source, { items: [...new Set(searched.map(l => l.words))], userId, today, keptOnly }, signal)
	if (answer.failed) return { shown: true, source: named, state: 'failed', lines: [] }
	if (answer.perDay) return { shown: true, source: named, state: 'wait', perDay: true, lines: [] }
	if (answer.wait) return { shown: true, source: named, state: 'wait', waitMinutes: Math.ceil(answer.wait / 60), lines: [] }
	if (!answer.found) return { shown: true, source: named, state: 'unchecked', lines: [] }
	const byWords = new Map(answer.found.map(item => [item.item.toLowerCase(), item.offers]))
	const matched = searched
		.map(({ line, index, words }) => ({ index, item: words, offer: matchFor(line, byWords.get(words) ?? [], date) }))
		.filter(l => l.offer)
	// pictures are asked for only with a check; on opening, only those kept are read
	const pictured = await withPictures(source, matched, { userId, today, keptOnly }, signal)
	return { shown: true, source: named, state: 'checked', lines: pictured.map(({ index, offer }) => ({ index, offer })) }
}
