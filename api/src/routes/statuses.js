import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'

/* The account's statuses (Settings 11a): listed in their order with how many orders carry each,
   added, renamed and recoloured, reordered, and deleted once no order carries one. */
export const router = Router()

const TONES = ['success', 'progress', 'danger', 'neutral']
// Draft is what an import brings orders in as, so it is always there
const BUILT_IN = ['Draft']
const NAME_MAX = 40

const selectAll = db.prepare('SELECT id, key, name, tone, position FROM statuses WHERE user_id = ? ORDER BY position, rowid')
const selectOne = db.prepare('SELECT id, key, name, tone FROM statuses WHERE user_id = ? AND key = ?')
const countByStatus = db.prepare('SELECT status, COUNT(*) n FROM orders WHERE user_id = ? GROUP BY status')
const countOne = db.prepare('SELECT COUNT(*) n FROM orders WHERE user_id = ? AND status = ?')
const selectDefault = db.prepare('SELECT default_status FROM settings WHERE user_id = ?')
const insertStatus = db.prepare('INSERT INTO statuses (id, user_id, key, name, tone, position) VALUES (?, ?, ?, ?, ?, ?)')
const updateStatus = db.prepare('UPDATE statuses SET name = ?, tone = ? WHERE user_id = ? AND key = ?')
const placeStatus = db.prepare('UPDATE statuses SET position = ? WHERE user_id = ? AND key = ?')
const deleteStatus = db.prepare('DELETE FROM statuses WHERE user_id = ? AND key = ?')

const list = userId => {
	const counts = new Map(countByStatus.all(userId).map(r => [r.status, r.n]))
	return selectAll.all(userId).map(s => ({
		key: s.key, name: s.name, tone: s.tone, builtIn: BUILT_IN.includes(s.key), orders: counts.get(s.key) ?? 0
	}))
}

const refuse = (res, error, status = 400) => res.status(status).json({ error })

/** A name and tone as asked, or the sentence that refuses them. */
function checked(userId, body, key = null) {
	const name = String(body.name ?? '').trim()
	if (!name) return { error: 'A status needs a name.' }
	if (name.length > NAME_MAX) return { error: `${NAME_MAX} characters at most for a status name.` }
	const clash = selectAll.all(userId).find(s => s.key !== key && s.name.toLowerCase() === name.toLowerCase())
	if (clash) return { error: `You already have a status called ${clash.name}.` }
	const tone = String(body.tone ?? 'neutral')
	if (!TONES.includes(tone)) return { error: 'Pick one of the four looks.' }
	return { name, tone }
}

router.get('/', (req, res) => res.json(list(req.user.id)))

router.post('/', (req, res) => {
	const ok = checked(req.user.id, req.body ?? {})
	if (ok.error) return refuse(res, ok.error)
	const id = newId('st')
	const last = selectAll.all(req.user.id).reduce((n, s) => Math.max(n, s.position), -1)
	insertStatus.run(id, req.user.id, id, ok.name, ok.tone, last + 1)
	res.status(201).json(list(req.user.id))
})

router.patch('/:key', (req, res) => {
	const status = selectOne.get(req.user.id, req.params.key)
	if (!status) return refuse(res, 'That status does not exist.', 404)
	const ok = checked(req.user.id, { name: status.name, tone: status.tone, ...req.body }, status.key)
	if (ok.error) return refuse(res, ok.error)
	updateStatus.run(ok.name, ok.tone, req.user.id, status.key)
	res.json(list(req.user.id))
})

const reorder = db.transaction((userId, keys) => keys.forEach((key, at) => placeStatus.run(at, userId, key)))

router.put('/order', (req, res) => {
	const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(String) : []
	const known = selectAll.all(req.user.id).map(s => s.key)
	if (keys.length !== known.length || !known.every(k => keys.includes(k))) return refuse(res, 'Send every status once, in the new order.')
	reorder(req.user.id, keys)
	res.json(list(req.user.id))
})

router.delete('/:key', (req, res) => {
	const status = selectOne.get(req.user.id, req.params.key)
	if (!status) return refuse(res, 'That status does not exist.', 404)
	if (BUILT_IN.includes(status.key)) return refuse(res, `${status.name} is built in and stays.`)
	if (countOne.get(req.user.id, status.key).n) return refuse(res, `Orders still have the status ${status.name}. Give them another status first.`, 409)
	if (selectDefault.get(req.user.id)?.default_status === status.key)
		return refuse(res, `${status.name} is the status a new order starts with. Choose another one in Defaults first.`, 409)
	deleteStatus.run(req.user.id, status.key)
	res.json(list(req.user.id))
})
