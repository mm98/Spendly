// The whole pages Storybook draws, each in one state: where it opens, and the presses that bring
// it to that state. scripts/record-pages.mjs walks the same list in the running app and keeps
// what the server answered, and pages/Pages.stories.jsx draws each one from those answers.
// `:order`, `:vendor` and `:category` are the first of each in the recorded account, and `:line`
// the first line of that order.
// A press names a control as a screen reader reads it: its role and its name, or the start of
// its name when `name` ends in '…'. `phone` is the press on a phone, where the page draws another control.

export const PAGE_STATES = [
	{ name: 'Home', path: '/' },
	{ name: 'Orders', path: '/orders' },
	{ name: 'Order', path: '/orders/:order' },
	{ name: 'Order, delete asked', path: '/orders/:order', press: [{ role: 'button', name: 'Delete order' }] },
	{ name: 'Order, edited', path: '/orders/:order/edit' },
	{ name: 'Order, a line open', path: '/orders/:order/edit', press: [{ role: 'button', name: 'Edit :line', phone: { role: 'button', name: ':line…' } }] },
	{ name: 'New order', path: '/orders/new' },
	{ name: 'Budget', path: '/budget' },
	{ name: 'Budget, edited', path: '/budget', press: [{ role: 'button', name: 'Edit' }] },
	{ name: 'Statistics', path: '/statistics' },
	{ name: 'Vendors', path: '/vendors' },
	{ name: 'Vendor, edited', path: '/vendors/:vendor/edit' },
	{ name: 'Categories', path: '/categories' },
	{ name: 'Category, edited', path: '/categories/:category/edit' },
	{ name: 'Bookmarks', path: '/bookmarks' },
	{ name: 'Settings', path: '/settings' }
]

const fill = (text, ids) => text.replace(/:(\w+)/g, (_, key) => ids[key])

export const pathOf = (state, ids) => fill(state.path, ids)

// the press on this shape, and the name to match: a whole name, or a start of one
export const pressOn = (press, phone) => (phone && press.phone) || press
export const nameOf = (press, ids) => {
	const name = fill(press.name, ids)
	return name.endsWith('…') ? new RegExp(`^${name.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : name
}
