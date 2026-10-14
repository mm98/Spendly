import { Fragment } from 'react'
import { ComboboxEmpty, ComboboxGroup, ComboboxSeparator } from '../components/Combobox.jsx'
import { useApi } from '../api/useApi.js'
import { getCategoryPage, getRecentCategoryNames, getRecentVendorNames, getSettings, getVendorPage } from '../api/client.js'
import { amount } from '../api/format.js'

/** A picker's first page (Rows per page) for the typed text, found by the server: `rows`, how many
    match (`matched`), and how many the untyped list holds (`total`). */
export function usePickList(kind, find, request) {
	const size = useApi(getSettings).data?.pageSize ?? 10
	const read = kind === 'vendor' ? getVendorPage : getCategoryPage
	// a category list leads with the favourites, as a vendor list does
	const base = { ...request, pageSize: size, ...(kind === 'category' && !request.sort ? { sort: 'favourites' } : {}) }
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

/** The vendors or categories the latest orders name, newest first: a picker's Recent group. */
export function useRecent(kind) {
	return useApi(kind === 'vendor' ? getRecentVendorNames : getRecentCategoryNames).data?.names ?? []
}

/** A picker's rows as Favourites, Recent and the rest, each only when it has rows (c5, 14a). A recent
    name past the first page is still offered by its name when the picker works by name (`byName`);
    one that works by id offers only the rows it holds. */
export function groupPicks(rows, recent, typed, rest, { byName = false } = {}) {
	const needle = typed.trim().toLowerCase()
	const favourites = rows.filter(r => r.favourite)
	const recents = recent
		.map(name => rows.find(r => r.name === name) ?? (byName && (!needle || name.toLowerCase().includes(needle)) ? { id: `recent ${name}`, name } : null))
		.filter(r => r && !r.favourite)
	const others = rows.filter(r => !r.favourite && !recents.some(x => x.name === r.name))
	return [['Favourites', favourites], ['Recent', recents], [rest, others]].filter(([, xs]) => xs.length)
}

/** The headings for a picker drawn as rows in a popover rather than as a combobox. */
export const rowHeads = { head: name => <div className="sp-menu__label" role="presentation">{name}</div>, rule: <div className="sp-rule" role="none" /> }

const comboboxHead = name => <ComboboxGroup>{name}</ComboboxGroup>

/** The groups of `groupPicks` as elements, headed when there is more than one. Called, not drawn, so a
    listbox finds the options; `head` and `rule` suit a list that is not a combobox. */
export function pickGroups(groups, render, { head = comboboxHead, rule = <ComboboxSeparator /> } = {}) {
	return groups.map(([name, rows], i) => (
		<Fragment key={name}>
			{i ? rule : null}
			{groups.length > 1 ? head(name) : null}
			{rows.map(render)}
		</Fragment>
	))
}
