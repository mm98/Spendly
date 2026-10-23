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

/* the words that open an amount, and which end of the range the amount is */
const ABOVE = [['over'], ['above'], ['more', 'than'], ['at', 'least'], ['min'], ['>'], ['>=']]
const BELOW = [['under'], ['below'], ['less', 'than'], ['at', 'most'], ['up', 'to'], ['max'], ['<'], ['<=']]

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
	// a range: 500-1000, 500 - 1000, 500 to 1000, between 500 and 1000
	const joined = words[at]?.word.match(/^([^-]+)-([^-]+)$/)
	if (joined) {
		const [min, max] = [amountOf(joined[1]), amountOf(joined[2])]
		if (min !== null && max !== null && Number(min) <= Number(max))
			return { length: UNITS.has(words[at + 1]?.word) ? 2 : 1, set: { min, max } }
	}
	const between = startsWith(words, at, ['between']) ? 1 : 0
	const low = amountAt(words, at + between)
	const joiner = low && words[at + between + low.length]?.word
	if (low && (between ? joiner === 'and' : joiner === '-' || joiner === 'to')) {
		const high = amountAt(words, at + between + low.length + 1)
		if (high && Number(low.value) <= Number(high.value))
			return { length: between + low.length + 1 + high.length, set: { min: low.value, max: high.value } }
	}
	return null
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const monthOf = word => {
	const short = word.replace(/\.$/, '')
	const full = MONTHS.indexOf(short)
	// "aug", "sept": three or four letters stand for the month they begin
	return full >= 0 || short.length < 3 || short.length > 4 ? full : MONTHS.findIndex(m => m.startsWith(short))
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const span = (from, to) => ({ from: iso(from), to: iso(to) })
const yearOf = (word, now) => (/^\d{4}$/.test(word) && Number(word) >= 1900 && Number(word) <= now.getFullYear() + 1 ? Number(word) : null)

/* a day inside the period before the one `now` is in, for each length a period can have */
const BEFORE = {
	week: n => new Date(n.getFullYear(), n.getMonth(), n.getDate() - 7),
	month: n => new Date(n.getFullYear(), n.getMonth() - 1, 15),
	quarter: n => new Date(n.getFullYear(), n.getMonth() - 3, 15),
	year: n => new Date(n.getFullYear() - 1, 6, 1)
}

function readPeriod(words, at, { now, presets }) {
	const [first, second] = [words[at]?.word, words[at + 1]?.word]
	const preset = presets.find(p => p.key === second)
	if (first === 'this' && preset) return { length: 2, set: { period: preset.key } }
	if ((first === 'last' || first === 'previous') && preset && BEFORE[preset.key]) {
		const [from, to] = preset.range(BEFORE[preset.key](now))
		return { length: 2, set: { from, to } }
	}
	const month = first ? monthOf(first) : -1
	if (month >= 0) {
		const year = second ? yearOf(second, now) : null
		// a month without a year is the last one there was
		const y = year ?? (month <= now.getMonth() ? now.getFullYear() : now.getFullYear() - 1)
		return { length: year === null ? 1 : 2, set: span(new Date(y, month, 1), new Date(y, month + 1, 0)) }
	}
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
const LEADS = { period: new Set(['in', 'during']), name: new Set(['from', 'at', 'in']) }
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
	return { parts, rest: rest.map(i => text.slice(words[i].start, words[i].end)).join(' '), restAt: rest, words }
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
