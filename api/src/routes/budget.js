import { Router } from 'express'
import {
	addAccount, addGroup, addLine, countDue, createYear, deleteAccount, deleteGroup, deleteLine, deleteYear, forgetLink,
	listAccountsInUse, listLinks, listYears, readYear, replaceYears, saveLink, updateAccount, updateGroup, updateLine
} from '../lib/budget.js'
import {
	BUDGET_TEXT, budgetAccountId, budgetAccountNames, budgetAmount, budgetKind, budgetMonth,
	budgetMonths, budgetText, budgetYear, budgetYears
} from '../lib/validate.js'
import { words } from '../lib/phrases.js'

export const router = Router()

const refuse = (status, message) => Object.assign(new Error(message), { status })

const position = value => {
	const n = Number(value)
	if (!Number.isInteger(n) || n < 0) throw refuse(400, words('list.placeLow'))
	return n
}

// Every change answers with the whole year as it now stands, so the page draws what was stored.
const sheet = (req, year) => readYear(req.user.id, year)

router.get('/', (req, res) => res.json({ years: listYears(req.user.id) }))

router.post('/import', (req, res) => {
	const years = budgetYears(req.body?.years)
	replaceYears(req.user.id, years, budgetAccountNames(req.body?.accounts))
	res.json({ years: years.map(y => y.year) })
})

/* The account list, above the year routes so /accounts is never read as a year. Each answer is
   the whole list, with how many rows use each account. */
const accounts = req => ({ accounts: listAccountsInUse(req.user.id) })

const greyFlag = value => {
	if (value === undefined) return null
	if (typeof value !== 'boolean') throw refuse(400, words('budget.greyYesNo'))
	return value
}

router.get('/accounts', (req, res) => res.json(accounts(req)))

router.post('/accounts', (req, res) => {
	addAccount(req.user.id, budgetText(req.body?.name, BUDGET_TEXT.account), greyFlag(req.body?.grey) ?? false)
	res.status(201).json(accounts(req))
})

router.patch('/accounts/:id', (req, res) => {
	const body = req.body ?? {}
	updateAccount(req.user.id, req.params.id, {
		name: body.name === undefined ? null : budgetText(body.name, BUDGET_TEXT.account),
		grey: greyFlag(body.grey),
		index: body.index === undefined ? null : position(body.index)
	})
	res.json(accounts(req))
})

router.delete('/accounts/:id', (req, res) => {
	deleteAccount(req.user.id, req.params.id)
	res.json(accounts(req))
})

/* Bank payments placed by hand: which row a payment's text belongs to, or that it belongs to
   none. Above the year routes, like the accounts. */
const links = req => ({ links: listLinks(req.user.id) })
const linkKey = body => ({
	pattern: budgetText(body?.pattern, BUDGET_TEXT.payment), kind: budgetKind(body?.kind)
})

router.get('/links', (req, res) => res.json(links(req)))

router.put('/links', (req, res) => {
	// a page still open from an earlier version sends the row's name and no lineId: refused, not stored as left out
	if (!req.body || !('lineId' in req.body)) throw refuse(400, words('budget.reloadToPlace'))
	const lineId = req.body.lineId == null ? null : String(req.body.lineId)
	saveLink(req.user.id, { ...linkKey(req.body), lineId })
	res.json(links(req))
})

router.delete('/links', (req, res) => {
	forgetLink(req.user.id, linkKey(req.query))
	res.json(links(req))
})

router.post('/', (req, res) => {
	const year = budgetYear(req.body?.year)
	const from = req.body?.from == null ? null : budgetYear(req.body.from)
	const amounts = req.body?.amounts ?? 'same'
	if (!['same', 'expected', 'none'].includes(amounts))
		throw refuse(400, words('budget.copyChoice'))
	createYear(req.user.id, year, { from, amounts })
	res.status(201).json(sheet(req, year))
})

// before /:year, which would read "due" as a year
router.get('/due', (req, res) => res.json({ due: countDue(req.user.id, budgetYear(req.query.year), budgetMonth(req.query.month)) }))

router.get('/:year', (req, res) => {
	const year = budgetYear(req.params.year)
	const found = sheet(req, year)
	if (!found) throw refuse(404, words('budget.noYear', { year }))
	res.json(found)
})

router.delete('/:year', (req, res) => {
	const year = budgetYear(req.params.year)
	if (!deleteYear(req.user.id, year)) throw refuse(404, words('budget.noYear', { year }))
	res.json({ year })
})

router.post('/:year/groups', (req, res) => {
	const year = addGroup(req.user.id, budgetYear(req.params.year), {
		kind: budgetKind(req.body?.kind), name: budgetText(req.body?.name, BUDGET_TEXT.group)
	})
	res.status(201).json(sheet(req, year))
})

router.patch('/groups/:id', (req, res) => {
	const body = req.body ?? {}
	const year = updateGroup(req.user.id, req.params.id, {
		name: body.name === undefined ? null : budgetText(body.name, BUDGET_TEXT.group),
		index: body.index === undefined ? null : position(body.index)
	})
	res.json(sheet(req, year))
})

router.delete('/groups/:id', (req, res) => res.json(sheet(req, deleteGroup(req.user.id, req.params.id))))

router.post('/groups/:id/lines', (req, res) => {
	const body = req.body ?? {}
	const year = addLine(req.user.id, req.params.id, {
		name: budgetText(body.name, BUDGET_TEXT.row), accountId: budgetAccountId(body.accountId),
		months: budgetMonths(body.months), index: body.index === undefined ? null : position(body.index)
	})
	res.status(201).json(sheet(req, year))
})

router.patch('/lines/:id', (req, res) => {
	const body = req.body ?? {}
	const patch = {}
	if (body.name !== undefined) patch.name = budgetText(body.name, BUDGET_TEXT.row)
	if (body.accountId !== undefined) patch.accountId = budgetAccountId(body.accountId)
	if (body.months !== undefined) patch.months = budgetMonths(body.months)
	if (body.month !== undefined) {
		patch.month = budgetMonth(body.month)
		if ('expected' in body) patch.expected = budgetAmount(body.expected)
		if ('real' in body) patch.real = budgetAmount(body.real)
	}
	if (body.groupId !== undefined) patch.groupId = String(body.groupId)
	if (body.index !== undefined) patch.index = position(body.index)
	res.json(sheet(req, updateLine(req.user.id, req.params.id, patch)))
})

router.delete('/lines/:id', (req, res) => res.json(sheet(req, deleteLine(req.user.id, req.params.id))))
