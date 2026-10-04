import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/* The one place this server fetches an address a user typed, so every hop is resolved and
   refused unless public, and nothing reports a failure: every way it fails is "nothing found". */

const TIMEOUT_MS = 6000
// A title lives in <head>, which is at the top of the document -- anything past this cannot be
// the answer, and reading it would only be bandwidth on a page that is mostly product images.
const MAX_BYTES = 256 * 1024
const MAX_REDIRECTS = 3

/** The address ranges a server must not be sent to. Everything not public is refused rather
    than a list of known-bad ones being blocked: a blocklist is a guess about what exists. */
function isPublicAddress(ip) {
	const kind = isIP(ip)
	if (kind === 4) {
		const [a, b] = ip.split('.').map(Number)
		if (a === 0 || a === 10 || a === 127) return false          // this host, private, loopback
		if (a === 169 && b === 254) return false                     // link-local, and cloud metadata
		if (a === 172 && b >= 16 && b <= 31) return false            // private
		if (a === 192 && b === 168) return false                     // private
		if (a === 100 && b >= 64 && b <= 127) return false           // carrier-grade NAT
		if (a === 198 && (b === 18 || b === 19)) return false         // benchmarking
		if (a >= 224) return false                                   // multicast and reserved
		return true
	}
	if (kind === 6) {
		const at = ip.toLowerCase()
		if (at === '::1' || at === '::') return false
		if (at.startsWith('fc') || at.startsWith('fd')) return false  // unique local
		if (at.startsWith('fe8') || at.startsWith('fe9') || at.startsWith('fea') || at.startsWith('feb')) return false
		// An IPv4 address wearing an IPv6 coat gets the IPv4 rules.
		const mapped = at.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
		if (mapped) return isPublicAddress(mapped[1])
		return true
	}
	return false
}

/** Every address the name resolves to, not just the first: one public answer beside a private
    one would be a way through. The name is resolved again by the fetch, which this cannot see. */
async function hostIsPublic(hostname) {
	if (isIP(hostname)) return isPublicAddress(hostname)
	try {
		const addresses = await lookup(hostname, { all: true, verbatim: true })
		return addresses.length > 0 && addresses.every(a => isPublicAddress(a.address))
	} catch {
		return false
	}
}

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
		if (at.protocol !== 'http:' && at.protocol !== 'https:') return NOTHING
		if (!await hostIsPublic(at.hostname)) return NOTHING

		let res
		try {
			res = await fetch(at, {
				redirect: 'manual',            // followed here instead, so every hop is checked too
				signal: AbortSignal.timeout(TIMEOUT_MS),
				headers: {
					// Named honestly. A shop that would rather not be read this way can say so.
					'User-Agent': 'Spendly/1.0 (+bookmark link preview)',
					'Accept': 'text/html,application/xhtml+xml'
				}
			})
		} catch { return NOTHING }

		if ([301, 302, 303, 307, 308].includes(res.status)) {
			const location = res.headers.get('location')
			if (!location) return NOTHING
			try { at = new URL(location, at) } catch { return NOTHING }
			continue
		}
		if (!res.ok) return NOTHING
		if (!(res.headers.get('content-type') ?? '').includes('html')) return NOTHING

		/* Read in chunks and stop at the cap rather than trusting content-length, which a page
		   may not send and may not mean. The body is dropped the moment the title is out of it.
		   Kept as bytes: the page's own charset is only known once its head has been read. */
		const reader = res.body?.getReader()
		if (!reader) return NOTHING
		const chunks = []
		let bytes = 0, seen = ''
		try {
			for (;;) {
				const { done, value } = await reader.read()
				if (done) break
				bytes += value.byteLength
				chunks.push(value)
				seen += Buffer.from(value).toString('latin1')
				// Both answers live in <head>, so the read stops there rather than at </title>:
				// og:image is often written after the title tag.
				if (/<\/head>/i.test(seen) || bytes >= MAX_BYTES) break
			}
		} finally {
			await reader.cancel().catch(() => {})
		}
		const html = decodeBody(Buffer.concat(chunks), res.headers.get('content-type') ?? '')
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
		if (at.protocol !== 'http:' && at.protocol !== 'https:') return null
		if (!await hostIsPublic(at.hostname)) return null

		let res
		try {
			res = await fetch(at, {
				redirect: 'manual',
				signal: AbortSignal.timeout(TIMEOUT_MS),
				headers: { 'User-Agent': 'Spendly/1.0 (+bookmark link preview)', 'Accept': 'image/*' }
			})
		} catch { return null }

		if ([301, 302, 303, 307, 308].includes(res.status)) {
			const location = res.headers.get('location')
			if (!location) return null
			try { at = new URL(location, at) } catch { return null }
			continue
		}
		if (!res.ok) return null
		const contentType = res.headers.get('content-type') ?? ''
		if (!contentType.startsWith('image/')) return null

		const reader = res.body?.getReader()
		if (!reader) return null
		const chunks = []
		let bytes = 0
		try {
			for (;;) {
				const { done, value } = await reader.read()
				if (done) break
				bytes += value.byteLength
				// Past the ceiling the answer is no picture, not a truncated one: half a JPEG
				// is a file nothing can draw.
				if (bytes > MAX_IMAGE_BYTES) return null
				chunks.push(value)
			}
		} catch { return null } finally {
			await reader.cancel().catch(() => {})
		}
		return { buffer: Buffer.concat(chunks), contentType: contentType.split(';')[0].trim() }
	}
	return null
}
