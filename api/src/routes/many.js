import http from 'node:http'

/* `GET /api/many?get=<address>&get=<address>`: each address is asked of this same server with the
   caller's headers, so it is signed in, cached and refused as it would be alone. Answers keep the order. */

export const MANY_MAX = 20

const FORWARDED = ['cookie', 'user-agent', 'accept-language', 'x-spendly-today']

const agent = new http.Agent({ keepAlive: true })

const readable = address => typeof address === 'string' && address.startsWith('/api/') && !address.startsWith('/api/many')

const ask = (port, path, headers) => new Promise((resolve, reject) => {
	http.get({ host: '127.0.0.1', port, path, headers, agent }, res => {
		const chunks = []
		res.on('data', chunk => chunks.push(chunk))
		res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }))
		res.on('error', reject)
	}).on('error', reject)
})

export async function readMany(req, res) {
	const asked = [req.query.get ?? []].flat()
	if (!asked.length || asked.length > MANY_MAX || !asked.every(readable))
		return res.status(400).json({ error: `Ask for 1 to ${MANY_MAX} addresses that start with /api/.` })
	const headers = Object.fromEntries(FORWARDED.filter(h => req.headers[h] !== undefined).map(h => [h, req.headers[h]]))
	// the address and scheme the caller came from, which this server trusts from its own machine
	headers['x-forwarded-for'] = req.ip
	headers['x-forwarded-proto'] = req.protocol
	const answers = await Promise.all(asked.map(path => ask(req.socket.localPort, path, headers)))
	// a read that renews the session renews it for the caller
	for (const answer of answers) for (const cookie of answer.headers['set-cookie'] ?? []) res.append('Set-Cookie', cookie)
	res.json({
		answers: answers.map(answer => {
			let body = null
			try { body = answer.text ? JSON.parse(answer.text) : null } catch { /* not a JSON answer */ }
			return { status: answer.status, body }
		})
	})
}
