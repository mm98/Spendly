// What a page story needs instead of the server: the answers kept by scripts/record-pages.mjs,
// given back to the page's own requests, and the clock set to when they were kept, so a page that
// counts from today draws the same days on every run. Each returns the function that undoes it.

import { holdClock } from '../.storybook/held.js'

// The clock stands at the moment the answers were kept, and does not move: a page that counts from
// today draws the same days on every run, and anything it draws from the time left stands still too.
// That moment is kept beside the answers, so it changes only when they are recorded again.
export const setClock = at => holdClock(at)

// A question asked again gets the next answer kept for it, and the last one after that. A
// question that was never asked during the recording gets the answer to the same address with
// another query, or a 404 the page draws as its error state.
export function serveAnswers(answers) {
	const real = window.fetch
	const asked = {}
	window.fetch = async (input, init = {}) => {
		const url = new URL(typeof input === 'string' ? input : input.url, location.href)
		if (!url.pathname.startsWith('/api/')) return real(input, init)
		const method = (init.method ?? (typeof input === 'string' ? 'GET' : input.method) ?? 'GET').toUpperCase()
		const key = `${method} ${url.pathname}${url.search}`
		const list = answers[key] ?? Object.entries(answers).find(([k]) => k.split('?')[0] === `${method} ${url.pathname}`)?.[1]
		if (!list) {
			console.warn(`No answer kept for ${key}: run scripts/record-pages.mjs again`)
			return new Response(JSON.stringify({ error: 'Not recorded' }), { status: 404, headers: { 'content-type': 'application/json' } })
		}
		const answer = list[Math.min(asked[key] = (asked[key] ?? -1) + 1, list.length - 1)]
		const empty = answer.status === 204 || answer.status === 304
		return new Response(empty ? null : answer.text, { status: answer.status, headers: { 'content-type': answer.type } })
	}
	return () => { window.fetch = real }
}
