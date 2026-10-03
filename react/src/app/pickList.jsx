import { ComboboxEmpty } from '../components/Combobox.jsx'
import { useApi } from '../api/useApi.js'
import { getCategoryPage, getSettings, getVendorPage } from '../api/client.js'
import { amount } from '../api/format.js'

/** A picker's first page (Rows per page) for the typed text, found by the server: `rows`, how many
    match (`matched`), and how many the untyped list holds (`total`). */
export function usePickList(kind, find, request) {
	const size = useApi(getSettings).data?.pageSize ?? 10
	const read = kind === 'vendor' ? getVendorPage : getCategoryPage
	const base = { ...request, pageSize: size }
	const needle = find.trim()
	const all = useApi(read, [base])
	const found = useApi(read, [{ ...base, query: needle }], { enabled: Boolean(needle) })
	const list = needle ? found : all
	const rows = list.data?.[kind === 'vendor' ? 'vendors' : 'categories']
	return { rows, matched: list.data?.matched, total: all.data?.matched, error: list.error ?? all.error }
}

/** What a picker says under its first page when more match: how many, and that typing finds them. */
export function moreText(rows, matched, noun) {
	const more = (matched ?? 0) - (rows?.length ?? 0)
	return more > 0 ? `${amount(more, 0)} more ${noun}. Type part of a name to find one.` : null
}

/** That line as the last row of a list of options. */
export function MoreMatches({ rows, matched, noun, ...rest }) {
	const text = moreText(rows, matched, noun)
	return text ? <ComboboxEmpty {...rest}>{text}</ComboboxEmpty> : null
}
