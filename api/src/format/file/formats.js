import { xlsx } from './xlsx.js'
import { csv } from './csv.js'
import { docx } from './docx.js'
import { pdf } from './pdf.js'

/* The file formats Ask makes, in the order Claude is offered them; the first is the one a file falls back to.
   A format is { type, name, word, mime, note?, options?, build(doc, write, options) } (README: "What Ask makes"). */
export const FILE_FORMATS = [xlsx, csv, docx, pdf]

export const fileFormat = type => FILE_FORMATS.find(f => f.type === type) ?? null

/** The options `asked` sets for `format`: each one it declares, as asked when it is of the declared type
    or one of its values, else its default. */
export function optionsFor(format, asked) {
	return Object.fromEntries(Object.entries(format.options ?? {}).map(([key, option]) => {
		const value = asked?.[key]
		const fits = option.enum ? option.enum.includes(value) : typeof value === option.type
		return [key, fits ? value : option.default]
	}))
}
