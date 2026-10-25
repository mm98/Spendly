import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { countMatching } from './orders.js'
import { draftCount } from '../lib/orderDrafts.js'

/* Saved order views (Order list 2g, Navigation shell 9e): one list, read by the sidebar and the
   order list's rail alike, each view with its live count. */
export const router = Router()

const NAME_MAX = 60
const QUERY_MAX = 2000
// how many views the sidebar lists until the account picks its own number (Settings 11a)
const SHOWN_FIRST = 4
const SHOWN = [2, 3, 4, 5, 6, 8, 10]

const selectViews = db.prepare('SELECT id, name, query, is_default, attention FROM user_saved_views WHERE user_id = ? ORDER BY position, rowid')
const selectView = db.prepare('SELECT id FROM user_saved_views WHERE id = ? AND user_id = ?')
const selectFirst = db.prepare('SELECT MIN(position) p FROM user_saved_views WHERE user_id = ?')
const selectShown = db.prepare('SELECT saved_views_shown AS shown FROM user_settings WHERE user_id = ?')
const updateShown = db.prepare('UPDATE user_settings SET saved_views_shown = ? WHERE user_id = ?')
const countAll = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const insertView = db.prepare('INSERT INTO user_saved_views (id, user_id, name, query, position, attention) VALUES (?, ?, ?, ?, ?, ?)')
const renameView = db.prepare('UPDATE user_saved_views SET name = ? WHERE id = ? AND user_id = ?')
const requeryView = db.prepare('UPDATE user_saved_views SET query = ? WHERE id = ? AND user_id = ?')
const flagView = db.prepare('UPDATE user_saved_views SET attention = ? WHERE id = ? AND user_id = ?')
const clearDefault = db.prepare('UPDATE user_saved_views SET is_default = 0 WHERE user_id = ?')
const makeDefault = db.prepare('UPDATE user_saved_views SET is_default = 1 WHERE id = ? AND user_id = ?')
const placeView = db.prepare('UPDATE user_saved_views SET position = ? WHERE id = ? AND user_id = ?')
const deleteView = db.prepare('DELETE FROM user_saved_views WHERE id = ? AND user_id = ?')

const iso = d => d.toISOString().slice(0, 10)
const utc = (y, m, d) => new Date(Date.UTC(y, m, d))

/** A period token as the dates it covers on `today` (Monday starts a week; quarters are calendar). */
export function periodRange(period, today) {
	const [y, m, d] = today.split('-').map(Number)
	const at = utc(y, m - 1, d)
	if (period === 'week') {
		const start = d - (at.getUTCDay() + 6) % 7
		return [iso(utc(y, m - 1, start)), iso(utc(y, m - 1, start + 6))]
	}
	if (period === 'month') return [iso(utc(y, m - 1, 1)), iso(utc(y, m, 0))]
	if (period === 'quarter') { const q = (m - 1) - (m - 1) % 3; return [iso(utc(y, q, 1)), iso(utc(y, q + 3, 0))] }
	if (period === 'year') return [`${y}-01-01`, `${y}-12-31`]
	return null
}

/** The order list's own address, as the list route's request. */
function requestOf(query, today) {
	const p = new URLSearchParams(query)
	const range = periodRange(p.get('period'), today)
	return {
		query: p.get('q') ?? '', vendorId: p.get('vendor') ?? '', categoryId: p.get('category') ?? '', status: p.get('status') ?? '',
		kind: p.get('kind') ?? '', receipt: p.get('receipt') ?? '', files: p.get('files') ?? '', discounted: p.get('discounted') ?? '',
		from: range ? range[0] : p.get('from') ?? '', to: range ? range[1] : p.get('to') ?? '',
		minAmount: p.get('min') ?? '', maxAmount: p.get('max') ?? ''
	}
}

const list = (userId, today) => ({
	// drafts are in the list, so All orders counts them as the list does
	all: countAll.get(userId).c + draftCount(userId),
	shown: selectShown.get(userId)?.shown ?? SHOWN_FIRST,
	views: selectViews.all(userId).map(v => ({
		id: v.id, name: v.name, query: v.query, isDefault: Boolean(v.is_default), attention: Boolean(v.attention),
		count: countMatching(userId, requestOf(v.query, today))
	}))
})

const cleanName = name => String(name ?? '').trim().slice(0, NAME_MAX)
const cleanQuery = query => {
	const p = new URLSearchParams(String(query ?? ''))
	p.delete('saved')
	return p.toString().slice(0, QUERY_MAX)
}
const refuse = (res, error, status = 400) => res.status(status).json({ error })

router.get('/', (req, res) => res.json(list(req.user.id, req.today)))

// a new view lands directly under All orders, so it is seen in both lists at once
router.post('/', (req, res) => {
	const name = cleanName(req.body?.name)
	if (!name) return refuse(res, 'A view needs a name.')
	const id = newId('sv')
	insertView.run(id, req.user.id, name, cleanQuery(req.body?.query), (selectFirst.get(req.user.id).p ?? 1) - 1, req.body?.attention === true ? 1 : 0)
	res.status(201).json({ id, ...list(req.user.id, req.today) })
})

router.put('/shown', (req, res) => {
	const shown = Number(req.body?.shown)
	if (!SHOWN.includes(shown)) return refuse(res, `Pick one of ${SHOWN.join(', ')}.`)
	updateShown.run(shown, req.user.id)
	res.json(list(req.user.id, req.today))
})

router.patch('/:id', (req, res) => {
	if (!selectView.get(req.params.id, req.user.id)) return refuse(res, 'That view does not exist.', 404)
	const body = req.body ?? {}
	if ('name' in body) {
		const name = cleanName(body.name)
		if (!name) return refuse(res, 'A view needs a name.')
		renameView.run(name, req.params.id, req.user.id)
	}
	if ('query' in body) requeryView.run(cleanQuery(body.query), req.params.id, req.user.id)
	// the amber count is the view's own setting, chosen when it is saved or edited (9e)
	if ('attention' in body) flagView.run(body.attention === true ? 1 : 0, req.params.id, req.user.id)
	if ('isDefault' in body) {
		clearDefault.run(req.user.id)
		if (body.isDefault === true) makeDefault.run(req.params.id, req.user.id)
	}
	res.json(list(req.user.id, req.today))
})

const reorder = db.transaction((userId, ids) => ids.forEach((id, at) => placeView.run(at, id, userId)))

router.put('/order', (req, res) => {
	const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
	const known = selectViews.all(req.user.id).map(v => v.id)
	if (ids.length !== known.length || !known.every(id => ids.includes(id))) return refuse(res, 'Send every view once, in the new order.')
	reorder(req.user.id, ids)
	res.json(list(req.user.id, req.today))
})

router.delete('/:id', (req, res) => {
	if (!deleteView.run(req.params.id, req.user.id).changes) return refuse(res, 'That view does not exist.', 404)
	res.json(list(req.user.id, req.today))
})
