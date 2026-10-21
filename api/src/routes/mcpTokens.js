import { Router } from 'express'
import { createMcpToken, listMcpTokens, removeMcpToken } from '../lib/mcpTokens.js'
import { MAX_NAME, cleanName } from './auth.js'

/* The account's tokens for /mcp (routes/mcp.js): made, listed and removed by the account itself.
   A token is shown once, in the answer that makes it; the list names each one, newest first, and when it was last used. */
export const router = Router()

// a token is a standing key to the account, so the list stays short enough to read and check
const MAX_TOKENS = 20

router.get('/', (req, res) => res.json({ tokens: listMcpTokens(req.user.id) }))

router.post('/', (req, res) => {
	const name = cleanName(req.body?.name)
	if (!name) return res.status(400).json({ error: 'Give the token a name, so you know where it is used.' })
	if (name.length > MAX_NAME) return res.status(400).json({ error: `A name is ${MAX_NAME} characters at most.` })
	if (listMcpTokens(req.user.id).length >= MAX_TOKENS) return res.status(409).json({ error: `An account can have ${MAX_TOKENS} tokens. Remove one first.` })
	res.status(201).json(createMcpToken(req.user.id, name))
})

// a removed token stops working at once: the next request with it is refused
router.delete('/:id', (req, res) => {
	if (!removeMcpToken(req.user.id, req.params.id)) return res.status(404).json({ error: 'That token is not on this account.' })
	res.status(204).end()
})
