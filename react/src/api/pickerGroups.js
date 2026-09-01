import { percent, plural, sep } from './format.js'
import { vendorTextMatch } from './client.js'

/** Favourites first and starred, then the rest -- every category dropdown's groups, built here
    rather than at each call site (README: Input types). `exclude` drops names already chosen. */
export const categoryGroups = (categories, { exclude = [] } = {}) => {
	const listed = (categories ?? []).filter(c => !exclude.includes(c.name))
	const option = c => ({ id: c.id, label: c.name, meta: `${percent(c.share)} of expenses` })
	return [
		{ heading: 'Favourites', options: listed.filter(c => c.favourite).map(c => ({ ...option(c), star: true })) },
		{ heading: 'All categories', options: listed.filter(c => !c.favourite).map(option) }
	]
}

/** The same split for vendors. `search` carries the aliases the dropdown filters on, and an
    alias `typed` matched is named in the meta line (README: Vendors). */
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
