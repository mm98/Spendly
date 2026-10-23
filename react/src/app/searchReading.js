/* What a list's search reads in typed text (Order list 2b): a part is a run of words and the filters it
   sets ({ min: '500' }), other words stay search text. Another kind of part is one more entry in READERS. */

const NUMBER = /^\d+(?:[.,]\d+)*$/
const UNITS = new Set(['kr', 'kr.', 'dkk', 'kroner'])

/** A typed amount as a plain number string: "3.000" and "3,000" are thousands, "12,50" is a decimal. */
function amountOf(word) {
	const bare = word.replace(/(kr\.?|dkk)$/, '')
	if (!NUMBER.test(bare)) return null
	if (/^\d{1,3}(?:[.,]\d{3})+$/.test(bare)) return bare.replace(/[.,]/g, '')
	const [whole, decimals, ...more] = bare.split(/[.,]/)
	if (more.length || (decimals !== undefined && decimals.length > 2)) return null
	return decimals === undefined ? whole : `${whole}.${decimals}`
}

/* the words that open an amount, in English and Danish, and which end of the range the amount is;
   "then" is read as "than", since it is typed for it so often */
const withThen = phrases => phrases.flatMap(p => (p.at(-1) === 'than' ? [p, [...p.slice(0, -1), 'then']] : [p]))
const ABOVE = withThen([['over'], ['above'], ['more', 'than'], ['greater', 'than'], ['bigger', 'than'], ['higher', 'than'],
	['more', 'expensive', 'than'], ['at', 'least'], ['min'], ['>'], ['>='], ['≥'],
	['mere', 'end'], ['større', 'end'], ['dyrere', 'end'], ['mindst']])
const BELOW = withThen([['under'], ['below'], ['less', 'than'], ['cheaper', 'than'], ['lower', 'than'], ['smaller', 'than'],
	['at', 'most'], ['up', 'to'], ['max'], ['<'], ['<='], ['≤'],
	['mindre', 'end'], ['billigere', 'end'], ['højst'], ['op', 'til']])
/* a sign written onto its amount: ">500", "≤200" */
const SIGNS = { '>': 'min', '>=': 'min', '≥': 'min', '<': 'max', '<=': 'max', '≤': 'max' }
/* the words after an amount that make it one end: "500 or more", "200 eller mindre" */
const AFTER = [[['or', 'more'], 'min'], [['and', 'up'], 'min'], [['eller', 'mere'], 'min'], [['or', 'less'], 'max'], [['eller', 'mindre'], 'max']]
const RANGE_JOINS = new Set(['-', 'to', 'til'])
const BETWEEN = [[['between'], 'and'], [['mellem'], 'og']]

const startsWith = (words, at, phrase) => phrase.every((w, i) => words[at + i]?.word === w)

/** An amount and any unit after it, from `at`: { value, length }. */
function amountAt(words, at) {
	const value = words[at] ? amountOf(words[at].word) : null
	if (value === null) return null
	return { value, length: UNITS.has(words[at + 1]?.word) ? 2 : 1 }
}

function readAmount(words, at) {
	for (const [phrases, key] of [[ABOVE, 'min'], [BELOW, 'max']])
		for (const phrase of phrases) {
			if (!startsWith(words, at, phrase)) continue
			const found = amountAt(words, at + phrase.length)
			if (found) return { length: phrase.length + found.length, set: { [key]: found.value } }
		}
	const signed = words[at]?.word.match(/^(>=|<=|>|<|≥|≤)(.+)$/)
	if (signed) {
		const value = amountOf(signed[2])
		if (value !== null) return { length: UNITS.has(words[at + 1]?.word) ? 2 : 1, set: { [SIGNS[signed[1]]]: value } }
	}
	// a range: 500-1000, 500 - 1000, 500 to 1000, between 500 and 1000, mellem 500 og 1000
	const joined = words[at]?.word.match(/^([^-]+)-([^-]+)$/)
	if (joined) {
		const [min, max] = [amountOf(joined[1]), amountOf(joined[2])]
		if (min !== null && max !== null && Number(min) <= Number(max))
			return { length: UNITS.has(words[at + 1]?.word) ? 2 : 1, set: { min, max } }
	}
	const [opener, and] = BETWEEN.find(([phrase]) => startsWith(words, at, phrase)) ?? [[], null]
	const low = amountAt(words, at + opener.length)
	const joiner = low && words[at + opener.length + low.length]?.word
	if (low && (and ? joiner === and : RANGE_JOINS.has(joiner))) {
		const high = amountAt(words, at + opener.length + low.length + 1)
		if (high && Number(low.value) <= Number(high.value))
			return { length: opener.length + low.length + 1 + high.length, set: { min: low.value, max: high.value } }
	}
	// an amount with its end after it: 500+, 500 or more
	const plus = words[at]?.word.match(/^(.+)\+$/)
	if (plus) {
		const value = amountOf(plus[1])
		if (value !== null) return { length: UNITS.has(words[at + 1]?.word) ? 2 : 1, set: { min: value } }
	}
	if (low && !opener.length) for (const [phrase, key] of AFTER)
		if (startsWith(words, at + low.length, phrase)) return { length: low.length + phrase.length, set: { [key]: low.value } }
	return null
}

const MONTHS = [
	['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
	['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']]
const monthOf = word => {
	const short = word.replace(/\.$/, '')
	for (const names of MONTHS) {
		const full = names.indexOf(short)
		if (full >= 0) return full
	}
	// "aug", "sept", "okt": three or four letters stand for the month they begin
	if (short.length < 3 || short.length > 4) return -1
	for (const names of MONTHS) {
		const begun = names.findIndex(m => m.startsWith(short))
		if (begun >= 0) return begun
	}
	return -1
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const span = (from, to) => ({ from: iso(from), to: iso(to) })
const yearOf = (word, now) => (/^\d{4}$/.test(word) && Number(word) >= 1900 && Number(word) <= now.getFullYear() + 1 ? Number(word) : null)
const dayOf = (now, back) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)

/* a day inside the period before the one `now` is in, for each length a period can have */
const BEFORE = {
	week: n => new Date(n.getFullYear(), n.getMonth(), n.getDate() - 7),
	month: n => new Date(n.getFullYear(), n.getMonth() - 1, 15),
	quarter: n => new Date(n.getFullYear(), n.getMonth() - 3, 15),
	year: n => new Date(n.getFullYear() - 1, 6, 1)
}
/* the words for this period and the one before, and the periods' own names, in English and Danish */
const THIS = new Set(['this', 'denne', 'dette'])
const LAST = new Set(['last', 'previous', 'sidste', 'forrige'])
const PERIOD_NAMES = { week: 'week', month: 'month', quarter: 'quarter', year: 'year', uge: 'week', måned: 'month', kvartal: 'quarter', år: 'year' }
/* one day, named: how many days back it is */
const DAYS = [[['today'], 0], [['i', 'dag'], 0], [['yesterday'], 1], [['i', 'går'], 1]]
/* the days up to today: "last 30 days", "sidste 30 dage" */
const DAY_WORDS = new Set(['days', 'day', 'dage', 'dag'])
const SINCE = new Set(['since', 'siden', 'fra'])

/** A month with an optional year after it, from `at`: { from, to, length }, the last such month there was without a year. */
function monthAt(words, at, now) {
	const month = words[at] ? monthOf(words[at].word) : -1
	if (month < 0) return null
	const year = words[at + 1] ? yearOf(words[at + 1].word, now) : null
	const y = year ?? (month <= now.getMonth() ? now.getFullYear() : now.getFullYear() - 1)
	return { from: new Date(y, month, 1), to: new Date(y, month + 1, 0), length: year === null ? 1 : 2 }
}

function readPeriod(words, at, { now, presets }) {
	const [first, second] = [words[at]?.word, words[at + 1]?.word]
	for (const [phrase, back] of DAYS)
		if (startsWith(words, at, phrase)) return { length: phrase.length, set: span(dayOf(now, back), dayOf(now, back)) }
	if (first === 'i' && second === 'år' && presets.some(p => p.key === 'year')) return { length: 2, set: { period: 'year' } }
	const preset = presets.find(p => p.key === PERIOD_NAMES[second])
	if (THIS.has(first) && preset) return { length: 2, set: { period: preset.key } }
	if (LAST.has(first) && preset && BEFORE[preset.key]) {
		const [from, to] = preset.range(BEFORE[preset.key](now))
		return { length: 2, set: { from, to } }
	}
	const count = second && /^\d{1,3}$/.test(second) ? Number(second) : 0
	if ((LAST.has(first) || first === 'past') && count > 0 && DAY_WORDS.has(words[at + 2]?.word))
		return { length: 3, set: span(dayOf(now, count - 1), now) }
	if (SINCE.has(first)) {
		const month = monthAt(words, at + 1, now)
		if (month) return { length: 1 + month.length, set: { from: iso(month.from) } }
		const year = second ? yearOf(second, now) : null
		if (year !== null) return { length: 2, set: { from: iso(new Date(year, 0, 1)) } }
	}
	const month = monthAt(words, at, now)
	if (month) return { length: month.length, set: span(month.from, month.to) }
	const year = first ? yearOf(first, now) : null
	if (year !== null) return { length: 1, set: span(new Date(year, 0, 1), new Date(year, 11, 31)) }
	return null
}

/* the longest run of words, up to this many, that is a shop's or a category's whole name */
const NAME_WORDS_MOST = 5
const KEY_OF_NAME = { vendor: 'vendor', category: 'category' }

function readName(words, at, { names }) {
	if (!names) return null
	for (let length = Math.min(NAME_WORDS_MOST, words.length - at); length > 0; length--) {
		const named = names.get(spanText(words.slice(at, at + length)))
		if (named) return { length, set: { [KEY_OF_NAME[named.kind]]: named.id } }
	}
	return null
}

/* a word before a part that belongs to it: "in august", "from Bilka" */
const LEADS = { period: new Set(['in', 'during', 'i']), name: new Set(['from', 'at', 'in', 'fra', 'hos', 'i']) }
const led = (leads, read) => (words, at, context) => {
	if (leads.has(words[at]?.word)) {
		const found = read(words, at + 1, context)
		if (found) return { ...found, length: found.length + 1 }
	}
	return read(words, at, context)
}

const READERS = [readAmount, led(LEADS.period, readPeriod), led(LEADS.name, readName)]

// quotes and brackets around a word, curly ones too (\u201c \u2018 \u00ab and their closing marks)
const EDGES = /^[("'\u201c\u2018\u00ab]+|[)"'\u201d\u2019\u00bb,;:!?]+$/g

/** The typed words, lowercased without the marks around them, each with where it stands in the text. */
export function wordsOf(text) {
	return [...text.matchAll(/\S+/g)].map(m => {
		const bare = m[0].toLowerCase().replace(EDGES, '')
		// a full stop ends a sentence, except in "kr."
		const word = bare.endsWith('.') && bare !== 'kr.' ? bare.slice(0, -1) : bare
		return { word, start: m.index, end: m.index + m[0].length }
	}).filter(w => w.word)
}

const spanText = words => words.map(w => w.word).join(' ')

/* words that only join a sentence together; once a part is read they are not searched as text,
   so "orders over 500 from netto" does not look for orders with the word "orders" in them */
const FILLERS = new Set(['orders', 'order', 'purchases', 'bought', 'spent', 'show', 'find', 'all', 'my', 'the', 'and', 'or', 'with',
	'for', 'of', 'on', 'in', 'at', 'from', 'ordrer', 'ordre', 'køb', 'købt', 'brugt', 'vis', 'alle', 'mine', 'og', 'med',
	'til', 'af', 'på', 'i', 'fra', 'hos', 'eller'])

/** What `text` holds: { parts, rest }. `names` maps a span (spanText) to the shop or category it names
    ({ kind, id }); without it, names are not read. `presets` are the list's named periods. */
export function readSearch(text, { now = new Date(), presets = [], names = null } = {}) {
	const words = wordsOf(text)
	const parts = []
	const rest = []
	for (let at = 0; at < words.length;) {
		const found = READERS.reduce((hit, read) => hit ?? read(words, at, { now, presets, names }), null)
		if (!found) { rest.push(at); at++; continue }
		parts.push({ start: words[at].start, end: words[at + found.length - 1].end, set: found.set })
		at += found.length
	}
	const searched = parts.length ? rest.filter(i => !FILLERS.has(words[i].word)) : rest
	return { parts, rest: searched.map(i => text.slice(words[i].start, words[i].end)).join(' '), restAt: rest, words }
}

/* how many spans one text may ask about, so a long sentence is still one short request */
const SPANS_MOST = 60

/** The runs of words that could be a shop's or a category's name: every run of the words nothing else read. */
export function nameSpans(text, options) {
	const { restAt, words } = readSearch(text, options)
	const spans = new Set()
	for (let i = 0; i < restAt.length; i++)
		for (let j = i; j < restAt.length && j - i < NAME_WORDS_MOST && restAt[j] - restAt[i] === j - i; j++)
			spans.add(spanText(words.slice(restAt[i], restAt[j] + 1)))
	return [...spans].slice(0, SPANS_MOST)
}

/** `text` without the words of `part`, and the space they leave. */
export const withoutPart = (text, part) => (text.slice(0, part.start) + text.slice(part.end)).replace(/\s{2,}/g, ' ').trim()
