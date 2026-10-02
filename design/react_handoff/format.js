/* Numbers, in the reader's own notation.

   The design shows amounts as `1.320,00 kr.` - a full stop grouping the thousands
   and a comma before the decimals, which is Danish. A native number input cannot
   render that: its value is always dot-decimal and ungrouped. So an amount is a
   text input with a decimal input mode, formatted for the locale on the way out and
   parsed back on the way in.

   Nothing here assumes Danish. The locale arrives as an argument, defaults to the
   browser's, and both separators are accepted on input - a reader typing 1320.50
   on a machine set to English gets the same number as one typing 1320,50. */

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

/** Reads a number from what the reader typed. Accepts either separator, ignores
    grouping, and returns null for anything that is not a number - never NaN, so a
    caller cannot store one by accident. */
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

/** Rounds to the decimals a field allows. Stepping 0.1 three times gives
    0.30000000000000004 in binary floating point; a quantity field must not show
    that. */
export function round(value, decimals = 0) {
	const f = 10 ** decimals
	return Math.round(value * f) / f
}
