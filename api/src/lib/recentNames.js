import { db } from '../db.js'

/* The vendors and categories the latest orders name, newest first: every picker's Recent group (c5).
   Names only, since a picker shows nothing else. */
const RECENT_ORDERS = 20
const RECENT_NAMES = 5

// newest first as the order list sorts them; through the date index, which the planner passes over here
const selectRecentOrders = db.prepare(`
	SELECT o.id, (SELECT name FROM vendors WHERE id = o.vendor_id) AS vendor
	FROM orders o INDEXED BY idx_orders_user_date WHERE o.user_id = ?
	ORDER BY o.date DESC, o.created_at DESC, o.rowid DESC LIMIT ${RECENT_ORDERS}`)
const selectOrdersCategories = db.prepare(`
	SELECT oc.order_id, c.name FROM order_categories oc JOIN categories c ON c.id = oc.category_id
	WHERE oc.order_id IN (SELECT value FROM json_each(?))`)

const firstNames = names => [...new Set(names.filter(Boolean))].slice(0, RECENT_NAMES)

export const recentVendorNames = userId => firstNames(selectRecentOrders.all(userId).map(o => o.vendor))

export function recentCategoryNames(userId) {
	const ids = selectRecentOrders.all(userId).map(o => o.id)
	const byOrder = new Map(ids.map(id => [id, []]))
	for (const row of selectOrdersCategories.all(JSON.stringify(ids))) byOrder.get(row.order_id).push(row.name)
	return firstNames([...byOrder.values()].flat())
}
