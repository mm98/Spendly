import { lookup } from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { BlockList, isIP } from 'node:net'

/* The one place this server fetches an address a user typed, so every hop is refused unless it
   connects to a public address, and nothing reports a failure: every way it fails is "nothing found". */

const TIMEOUT_MS = 6000
// A title lives in <head>, which is at the top of the document -- anything past this cannot be
// the answer, and reading it would only be bandwidth on a page that is mostly product images.
const MAX_BYTES = 256 * 1024
const MAX_REDIRECTS = 3

/** The address ranges a server must not be sent to. Everything not public is refused rather
    than a list of known-bad ones being blocked: a blocklist is a guess about what exists. */
const NOT_PUBLIC = new BlockList()
for (const [net, bits] of [
	['0.0.0.0', 8], ['10.0.0.0', 8], ['127.0.0.0', 8],   // this host, private, loopback
	['169.254.0.0', 16],                                   // link-local, and cloud metadata
	['172.16.0.0', 12], ['192.168.0.0', 16],               // private
	['100.64.0.0', 10],                                    // carrier-grade NAT
	['198.18.0.0', 15],                                    // benchmarking
	['224.0.0.0', 3]                                       // multicast and reserved
]) NOT_PUBLIC.addSubnet(net, bits, 'ipv4')
for (const [net, bits] of [
	['::', 96],                                            // unspecified, loopback, IPv4-compatible
	['64:ff9b::', 96], ['64:ff9b:1::', 48], ['2002::', 16], // IPv4 carried inside IPv6
	['fc00::', 7], ['fe80::', 10], ['ff00::', 8]           // unique local, link-local, multicast
]) NOT_PUBLIC.addSubnet(net, bits, 'ipv6')

// checked by number, not by spelling: an IPv4 address inside IPv6 (::ffff:7f00:1) meets the IPv4 ranges
function isPublicAddress(ip) {
	const kind = isIP(ip)
	return kind !== 0 && !NOT_PUBLIC.check(ip, kind === 4 ? 'ipv4' : 'ipv6')
}

// the connection's own lookup, so the address checked is the one connected to; every answer must be public
function publicLookup(hostname, options, callback) {
	lookup(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
		if (error) return callback(error)
		if (!addresses.length || !addresses.every(a => isPublicAddress(a.address)))
			return callback(Object.assign(new Error(`${hostname} is not a public address`), { code: 'ENOTFOUND' }))
		if (options.all) return callback(null, addresses)
		callback(null, addresses[0].address, addresses[0].family)
	})
}

/** One GET, never following a redirect, or null when the address is not public or cannot be
    reached. A literal address never goes through a lookup, so it is checked here. */
function getPublic(at, accept) {
	if (at.protocol !== 'http:' && at.protocol !== 'https:') return Promise.resolve(null)
	const host = at.hostname.replace(/^\[|\]$/g, '')
	if (isIP(host) && !isPublicAddress(host)) return Promise.resolve(null)
	return new Promise(settle => {
		const ask = (at.protocol === 'https:' ? https : http).get(at, {
			lookup: publicLookup,
			signal: AbortSignal.timeout(TIMEOUT_MS),
			// Named honestly. A shop that would rather not be read this way can say so.
			headers: { 'User-Agent': 'Spendly/1.0 (+bookmark link preview)', 'Accept': accept }
		}, settle)
		ask.on('error', error => {
			console.error(`Link preview: ${at.host} could not be reached: ${error.message}`)
			settle(null)
		})
	})
}

const REDIRECTS = [301, 302, 303, 307, 308]

/* Named references are case-sensitive in HTML (&Oslash; is not &oslash;), so this is looked up
   as written. Numeric ones are decoded arithmetically below and need no table. */
const NAMED = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
	aelig: 'æ', oslash: 'ø', aring: 'å', AElig: 'Æ', Oslash: 'Ø', Aring: 'Å',
	ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”'
}

/** The content of the first <meta> naming any of `names`, in the order given. */
const metaContent = (html, names) => {
	for (const name of names) {
		const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`, 'i'))
		const content = tag && tag[0].match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
		if (content && content.trim()) return content.trim()
	}
	return null
}

/* A Danish shop escapes its own name mostly numerically: "n&#248;glebr&#230;t" has to reach a
   reader as "nøglebræt". Anything unrecognised is left exactly as written. */
const decode = text => text
	.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
		if (ref[0] !== '#') return NAMED[ref] ?? whole
		const code = ref[1].toLowerCase() === 'x' ? parseInt(ref.slice(2), 16) : Number(ref.slice(1))
		// Nothing outside a real character: a code of 0, a lone surrogate half or a value past
		// the last code point is a broken reference, not a letter.
		if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return whole
		if (code >= 0xd800 && code <= 0xdfff) return whole
		return String.fromCodePoint(code)
	})
	.replace(/\s+/g, ' ')
	.trim()

/** The charset a page declares: its Content-Type header first, then a <meta> in its head.
    Latin-1 bytes read as UTF-8 turn every æ, ø and å into a broken character. */
export function decodeBody(buffer, contentType) {
	const head = buffer.subarray(0, 4096).toString('latin1')
	const name = contentType.match(/charset\s*=\s*["']?([\w:.-]+)/i)?.[1]
		?? head.match(/<meta[^>]+charset\s*=\s*["']?([\w:.-]+)/i)?.[1]
		?? 'utf-8'
	let decoder
	try { decoder = new TextDecoder(name) } catch { decoder = new TextDecoder('utf-8') }
	return decoder.decode(buffer)
}

/** The name a page gives itself: what it tells a link preview first, then its own <title>.
    Returns null when it says neither. */
export function titleFrom(html) {
	const raw = metaContent(html, ['og:title', 'twitter:title'])
		?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
	if (!raw) return null
	const text = decode(raw)
	// The bookmark's own name field takes 120 characters, and a page title that runs longer than
	// that is a sentence about the shop rather than a name for the thing.
	return text ? text.slice(0, 120) : null
}

/** Resolved against the page, since a shop may write `/img/sko.jpg`. Only the preview tags are
    read: publishing one is offering it, unlike an image taken out of the page's body. */
export function imageFrom(html, pageUrl) {
	const raw = metaContent(html, ['og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image', 'twitter:image:src'])
	if (!raw) return null
	let at
	try { at = new URL(decode(raw), pageUrl) } catch { return null }
	if (at.protocol !== 'http:' && at.protocol !== 'https:') return null
	return at.href
}

/** `{ title, image }`, either of which may be null. Never throws: every caller treats "no
    answer" and "nothing there" as one thing. */
export async function fetchPagePreview(url) {
	const NOTHING = { title: null, image: null }
	let at
	try { at = new URL(url) } catch { return NOTHING }
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		// redirects are followed here, so every hop is checked too
		const res = await getPublic(at, 'text/html,application/xhtml+xml')
		if (!res) return NOTHING

		if (REDIRECTS.includes(res.statusCode)) {
			res.destroy()
			const location = res.headers.location
			if (!location) return NOTHING
			try { at = new URL(location, at) } catch { return NOTHING }
			continue
		}
		const contentType = res.headers['content-type'] ?? ''
		if (res.statusCode < 200 || res.statusCode > 299 || !contentType.includes('html')) {
			res.destroy()
			if (res.statusCode < 200 || res.statusCode > 299) console.error(`Link preview: ${at.href} answered ${res.statusCode}`)
			return NOTHING
		}

		/* Read in chunks and stop at the cap rather than trusting content-length, which a page
		   may not send and may not mean. The body is dropped the moment the title is out of it.
		   Kept as bytes: the page's own charset is only known once its head has been read. */
		const chunks = []
		let bytes = 0, seen = ''
		try {
			for await (const value of res) {
				bytes += value.byteLength
				chunks.push(value)
				seen += value.toString('latin1')
				// Both answers live in <head>, so the read stops there rather than at </title>:
				// og:image is often written after the title tag.
				if (/<\/head>/i.test(seen) || bytes >= MAX_BYTES) break
			}
		} catch (error) {
			console.error(`Link preview: reading ${at.href} failed: ${error.message}`)
			return NOTHING
		} finally {
			res.destroy()
		}
		const html = decodeBody(Buffer.concat(chunks), contentType)
		return { title: titleFrom(html), image: imageFrom(html, at) }
	}
	return NOTHING   // redirected past the cap
}

/* Same guards as the page read: the address came off a page this server was pointed at, so it
   is no more trusted than the one that named it. Plus a type check and a ceiling on the read. */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export async function fetchImage(url) {
	let at
	try { at = new URL(url) } catch { return null }
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const res = await getPublic(at, 'image/*')
		if (!res) return null

		if (REDIRECTS.includes(res.statusCode)) {
			res.destroy()
			const location = res.headers.location
			if (!location) return null
			try { at = new URL(location, at) } catch { return null }
			continue
		}
		const contentType = res.headers['content-type'] ?? ''
		if (res.statusCode < 200 || res.statusCode > 299 || !contentType.startsWith('image/')) {
			res.destroy()
			if (res.statusCode < 200 || res.statusCode > 299) console.error(`Link preview: ${at.href} answered ${res.statusCode}`)
			return null
		}

		const chunks = []
		let bytes = 0
		try {
			for await (const value of res) {
				bytes += value.byteLength
				// Past the ceiling the answer is no picture, not a truncated one: half a JPEG
				// is a file nothing can draw.
				if (bytes > MAX_IMAGE_BYTES) return null
				chunks.push(value)
			}
		} catch (error) {
			console.error(`Link preview: reading ${at.href} failed: ${error.message}`)
			return null
		} finally {
			res.destroy()
		}
		return { buffer: Buffer.concat(chunks), contentType: contentType.split(';')[0].trim() }
	}
	return null
}
