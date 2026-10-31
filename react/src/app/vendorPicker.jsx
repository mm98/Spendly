import { Fragment, useEffect, useRef, useState } from 'react'
import { Combobox, ComboboxGroup, ComboboxOption, ComboboxSeparator } from '../components/Combobox.jsx'
import { getVendorPage, vendorTextMatch } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { MoreMatches, usePickList } from './pickList.jsx'
import { usePhrase } from '../language/phrases.js'

/** The typed text in bold where it falls in a name (c5). */
const bolded = (name, typed) => {
	const at = typed ? name.toLowerCase().indexOf(typed.toLowerCase()) : -1
	if (at < 0) return name
	return <>{name.slice(0, at)}<b>{name.slice(at, at + typed.length)}</b>{name.slice(at + typed.length)}</>
}

/** Vendors as you type their name or an alias, in Favourites, Recent and the rest (c5, 14a); a name that is
    none of them becomes a new one. The list holds the server's first page. `quiet` keeps it shut while held. */
export function VendorPicker({ recent, value, onPick, quiet, ...rest }) {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const typed = query.trim()
	// a name typed and left in the field is the reader's choice; Escape and a picked option are not
	const left = useRef({ picked: false, escaped: false })
	useEffect(() => {
		if (!open) return undefined
		const escape = ev => { if (ev.key === 'Escape') left.current.escaped = true }
		document.addEventListener('keydown', escape, true)
		return () => document.removeEventListener('keydown', escape, true)
	}, [open])
	const page = usePickList('vendor', typed, {})
	const found = (page.rows ?? []).map(v => ({ v, hit: vendorTextMatch(v, typed) }))
	const favourites = found.filter(x => x.v.favourite)
	// a recent vendor past the page is still offered by its name
	const recents = recent.map(name => found.find(x => x.v.name === name)
		?? (vendorTextMatch({ name }, typed).matches ? { v: { id: 'recent ' + name, name }, hit: { alias: null } } : null))
		.filter(x => x && !x.v.favourite)
	const others = found.filter(x => !favourites.includes(x) && !recents.some(r => r.v.name === x.v.name)).sort((a, b) => a.v.name.localeCompare(b.v.name))
	const groups = [[phrase('pick.favourites'), favourites], [phrase('pick.recent'), recents], [phrase('form.otherVendors'), others]].filter(([, xs]) => xs.length)
	const exact = useApi(getVendorPage, [{ name: typed, pageSize: 0 }], { enabled: Boolean(typed) })
	const known = typed && (exact.loading || !exact.data || exact.data.matched > 0)
	return (
		<Combobox searchable value={value} placeholder={phrase('form.chooseVendor')} open={open}
			onOpenChange={next => {
				if (next && quiet?.current) return
				setOpen(next)
				if (!next) {
					if (typed && typed !== value && !left.current.picked && !left.current.escaped) onPick(typed)
					left.current = { picked: false, escaped: false }
					setQuery('')
				}
			}}
			onSearch={setQuery} noun="vendors" {...rest}>
			{groups.map(([name, xs], i) => (
				<Fragment key={name}>
					{i ? <ComboboxSeparator /> : null}
					{groups.length > 1 ? <ComboboxGroup>{name}</ComboboxGroup> : null}
					{xs.map(({ v, hit }) => (
						<ComboboxOption key={v.id} selected={v.name === value} onSelect={() => { left.current.picked = true; onPick(v.name) }}
							meta={hit.alias ?? undefined}>{bolded(v.name, typed)}</ComboboxOption>
					))}
				</Fragment>
			))}
			<MoreMatches rows={page.rows} matched={page.matched} noun="vendors" />
			{typed && !known
				? <>{groups.length ? <ComboboxSeparator /> : null}<ComboboxOption create onSelect={() => { left.current.picked = true; onPick(typed) }}>{phrase('form.createNamed', { name: typed })}</ComboboxOption></>
				: null}
		</Combobox>
	)
}
