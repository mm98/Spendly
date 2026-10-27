import { Router } from 'express'
import { securityLog } from '../lib/securityLog.js'
import { mcpTokenUser } from '../lib/mcpTokens.js'
import { callTool, toolList } from '../lib/mcpTools.js'

// The MCP endpoint (Streamable HTTP, stateless, JSON answers). The token names the account,
// as `Authorization: Bearer <token>` or as the address /mcp/<token> for a client that takes only an address.

export const router = Router()

// the newest first: a client asking for a version not listed here is answered with the newest
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'spendly', title: 'Spendly', version: '1.0.0' }
const INSTRUCTIONS = 'Spendly keeps one person\'s orders, shops, categories and budget. These tools only read; nothing can be changed through them. Amounts are in the account\'s own currency, and dates are YYYY-MM-DD.'

// a batch is answered in one go, so its size bounds the work one request can ask for
const BATCH_MOST = 20

const PARSE_ERROR = -32700, INVALID_REQUEST = -32600, METHOD_NOT_FOUND = -32601, INVALID_PARAMS = -32602, INTERNAL_ERROR = -32603

const tokenOf = req => {
	const bearer = req.headers.authorization
	if (bearer?.startsWith('Bearer ')) return bearer.slice(7).trim()
	return req.params.token ?? null
}

const reply = (id, result) => ({ jsonrpc: '2.0', id, result })
const refuse = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

async function answer(message, token, self) {
	if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return refuse(message?.id, INVALID_REQUEST, 'Not a JSON-RPC 2.0 request.')
	const { id, method, params } = message
	// a notification (no id) is answered with nothing
	if (id === undefined) return null
	if (method === 'initialize') {
		const asked = params?.protocolVersion
		return reply(id, {
			protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
			capabilities: { tools: { listChanged: false } },
			serverInfo: SERVER_INFO,
			instructions: INSTRUCTIONS
		})
	}
	if (method === 'ping') return reply(id, {})
	if (method === 'tools/list') return reply(id, { tools: toolList() })
	if (method === 'tools/call') {
		try {
			const result = await callTool(params?.name, params?.arguments ?? {}, token, self)
			return result ? reply(id, result) : refuse(id, INVALID_PARAMS, `No tool named ${params?.name}.`)
		} catch (e) {
			console.error(e)
			return refuse(id, INTERNAL_ERROR, 'Spendly could not answer. Try again.')
		}
	}
	return refuse(id, METHOD_NOT_FOUND, `Spendly does not answer ${method}.`)
}

function signedIn(req, res, next) {
	const token = tokenOf(req)
	if (!mcpTokenUser(token)) {
		securityLog(req, 'assistant-token-refused', { reason: token ? 'unknown or removed token' : 'no token' })
		res.setHeader('WWW-Authenticate', 'Bearer realm="spendly"')
		return res.status(401).json(refuse(null, INVALID_REQUEST, 'The token is missing, or it was removed in Settings.'))
	}
	req.mcpToken = token
	next()
}

/* A page on another site could reach a server on a home network by its address; the token stops it
   reading, and this stops it trying. A program that is not a browser sends no Origin. */
function sameOrigin(req, res, next) {
	const origin = req.headers.origin
	if (origin) {
		let host
		try { host = new URL(origin).host } catch { host = null }
		if (host !== req.headers.host) return res.status(403).json(refuse(null, INVALID_REQUEST, 'This request did not come from Spendly.'))
	}
	next()
}

const handle = async (req, res) => {
	if (req.body === undefined || req.body === null || typeof req.body !== 'object') return res.status(400).json(refuse(null, PARSE_ERROR, 'The body is not JSON.'))
	const batch = Array.isArray(req.body)
	if (batch && req.body.length > BATCH_MOST) return res.status(400).json(refuse(null, INVALID_REQUEST, `Send at most ${BATCH_MOST} requests at once.`))
	// the port this request arrived on is this server's, behind a proxy or not
	const self = `http://127.0.0.1:${req.socket.localPort}`
	const answers = (await Promise.all((batch ? req.body : [req.body]).map(m => answer(m, req.mcpToken, self)))).filter(Boolean)
	// only notifications and answers to them: accepted, nothing to say
	if (!answers.length) return res.status(202).end()
	res.json(batch ? answers : answers[0])
}

// no stream is offered from the server's side, and there is no session to end
const notOffered = (req, res) => res.status(405).set('Allow', 'POST').json(refuse(null, INVALID_REQUEST, 'Send requests with POST.'))

for (const path of ['/', '/:token']) {
	router.post(path, sameOrigin, signedIn, handle)
	router.get(path, notOffered)
	router.delete(path, notOffered)
}
