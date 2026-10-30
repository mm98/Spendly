import { Router } from 'express'
import { securityLog } from '../lib/securityLog.js'
import { createMcpToken, listMcpTokens, removeMcpToken } from '../lib/mcpTokens.js'
import { MAX_NAME, cleanName } from './auth.js'
import { words } from '../lib/phrases.js'

/* The account's tokens for /mcp (routes/mcp.js): made, listed and removed by the account itself.
   A token is shown once, in the answer that makes it; the list names each one, newest first, and when it was last used. */
export const router = Router()

// a token is a standing key to the account, so the list stays short enough to read and check
const MAX_TOKENS = 20

router.get('/', (req, res) => res.json({ tokens: listMcpTokens(req.user.id) }))

router.post('/', (req, res) => {
	const name = cleanName(req.body?.name)
	if (!name) return res.status(400).json({ error: words('token.nameMissing') })
	if (name.length > MAX_NAME) return res.status(400).json({ error: words('account.nameLong', { most: MAX_NAME }) })
	if (listMcpTokens(req.user.id).length >= MAX_TOKENS) return res.status(409).json({ error: words('token.full', { most: MAX_TOKENS }) })
	const made = createMcpToken(req.user.id, name)
	securityLog(req, 'assistant-token-made', { tokenId: made.id, name })
	res.status(201).json(made)
})

// a removed token stops working at once: the next request with it is refused
router.delete('/:id', (req, res) => {
	if (!removeMcpToken(req.user.id, req.params.id)) return res.status(404).json({ error: words('token.notHere') })
	securityLog(req, 'assistant-token-removed', { tokenId: req.params.id })
	res.status(204).end()
})
