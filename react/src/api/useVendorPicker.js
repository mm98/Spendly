import { createVendor, failureMessage, invalidateVendorData, vendorByAnyName, vendorTextMatch } from './client.js'
import { plural, sep } from './format.js'

/** The vendor picker every order form shares -- New order's step 1 and Edit order used to
    carry their own copy of this, and the alias-search fix landed in one of the two the first
    time round (README: Vendors, docs/defects.md). One hook now, so the next order form gets
    it for free instead of needing to be found and fixed again.

    Typed text that names an existing vendor's alias resolves to that vendor rather than
    offering to create a twin -- the action row reads USE before it is pressed, and `addVendor`
    resolves the same way if it is somehow pressed anyway. The dropdown itself searches every
    vendor's name *and* aliases, not the name alone: `search` is what Combobox filters typed
    text against, and the matched alias is named in the meta line for the reason All vendors
    names it there too -- the typed text may appear nowhere else on the row it returns.

    `vendors` is a useApi(getVendors) result -- `.data` for the list, `.refresh()` after a
    create. `value` is the field's current text. `onPick` commits a vendor name (chosen,
    resolved from an alias, or freshly created); it stays the caller's, since New order and
    Edit order recheck their own field errors from two different draft shapes. */
export function useVendorPicker(vendors, value, onPick, toast) {
	const list = vendors.data ?? []
	const aliasHit = vendorByAnyName(list, value)

	const vendorOption = v => {
		const { alias } = vendorTextMatch(v, value)
		return {
			id: v.id, label: v.name,
			meta: plural(v.orders, 'order') + (alias ? `${sep}also ${alias}` : ''),
			search: [v.name, ...(v.aliases ?? [])].join(' ')
		}
	}

	const groups = [
		{ heading: 'Favourites', options: list.filter(v => v.favourite).map(v => ({ ...vendorOption(v), star: true })) },
		{ heading: 'All vendors', options: list.filter(v => !v.favourite).map(vendorOption) }
	]

	/* CREATE VENDOR "..." is the foot of the vendor list, and it creates the vendor rather than
	   only typing its name into the field -- a row labelled with a verb that does not do the
	   verb is the decorative-control rule inside a dropdown. README: Honest Affordances. */
	const addVendor = name => {
		const clean = String(name).trim()
		if (!clean) return
		const existing = vendorByAnyName(list, clean)
		if (existing) {
			onPick(existing.name)
			toast(`"${clean}" is an alias of ${existing.name}, so ${existing.name} is used.`)
			return
		}
		createVendor(clean)
			.then(vendor => {
				invalidateVendorData()
				vendors.refresh()
				onPick(vendor.name)
				toast(`${vendor.name} added to your vendors.`)
			})
			.catch(e => toast(failureMessage(e, 'The vendor was not created. Try again.'), 'negative'))
	}

	const typed = String(value ?? '').trim()
	const action = aliasHit
		? { icon: 'check', label: `USE ${aliasHit.name.toUpperCase()}: "${typed.toUpperCase()}" IS ITS ALIAS`, onSelect: addVendor }
		: { icon: 'plus', label: `CREATE VENDOR "${typed.toUpperCase()}"`, onSelect: addVendor }

	return { groups, action }
}
