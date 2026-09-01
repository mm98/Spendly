import { percent, plural, sep } from './format.js'
import { vendorTextMatch } from './client.js'

/* The groups a vendor or category dropdown offers, built in one place.

   README: Input types groups a searchable picker Favourites → All, and every call site used to
   build its own two groups -- so a picker added later simply listed everything and the starred
   records led nothing. Nothing here is a call site's to decide. */

/** Favourites first and starred, then the rest. `exclude` drops names already chosen, which is
    what a field holding chips needs and a filter picking one value does not. */
export const categoryGroups = (categories, { exclude = [] } = {}) => {
	const listed = (categories ?? []).filter(c => !exclude.includes(c.name))
	const option = c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })
	return [
		{ heading: 'Favourites', options: listed.filter(c => c.favourite).map(c => ({ ...option(c), star: true })) },
		{ heading: 'All categories', options: listed.filter(c => !c.favourite).map(option) }
	]
}

/** The same split for vendors. `typed` is the field's current text: a vendor matched through an
    alias names that alias in its meta line, because the text may appear nowhere else on the row
    (README: Vendors), and `search` is what the dropdown filters against. */
export const vendorGroups = (vendors, typed = '') => {
	const listed = vendors ?? []
	const option = v => {
		const { alias } = vendorTextMatch(v, typed)
		return {
			id: v.id, label: v.name,
			meta: plural(v.orders, 'order') + (alias ? `${sep}also ${alias}` : ''),
			search: [v.name, ...(v.aliases ?? [])].join(' ')
		}
	}
	return [
		{ heading: 'Favourites', options: listed.filter(v => v.favourite).map(v => ({ ...option(v), star: true })) },
		{ heading: 'All vendors', options: listed.filter(v => !v.favourite).map(option) }
	]
}
