
/** Formats a number the way the reader writes it. Fixed decimals, so a column of
    amounts aligns on its separator. */
export function formatNumber(value, { locale, decimals = 2 } = {}) {
	if (value === null || value === undefined || value === '') return ''
	const n = typeof value === 'number' ? value : parseNumber(value, { locale })
	if (n === null || Number.isNaN(n)) return ''
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(n)
}

export function parseNumber(text, { locale } = {}) {
	if (typeof text === 'number') return text
	if (!text) return null
	const decimal = decimalSeparator(locale)
	// every separator that is not the decimal one is grouping, whatever the locale
	const cleaned = String(text)
		.replace(/\s|\u00a0|\u202f/g, '')
		.replace(decimal === ',' ? /\./g : /,/g, '')
		.replace(decimal, '.')
		.replace(/[^\d.-]/g, '')
	if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
	const n = Number(cleaned)
	return Number.isFinite(n) ? n : null
}

/** What this locale puts before the decimals. Internal: it is what parseNumber
    reads, and a caller that needs it is formatting a number itself. */
function decimalSeparator(locale) {
	return new Intl.NumberFormat(locale).formatToParts(1.1).find(p => p.type === 'decimal')?.value ?? '.'
}

export function round(value, decimals = 0) {
	const f = 10 ** decimals
	return Math.round(value * f) / f
}
