import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/* Reading what a thing is called, and what it looks like, off the page it is sold on.

   This is the one place the server fetches an address a user typed, which makes it the one
   place that can be talked into fetching something it should not: a link naming 127.0.0.1, or
   a cloud metadata endpoint, is a request the browser could never make but this process can.
   So every hop is resolved first and refused if it lands anywhere but a public address, the
   read is bounded in bytes and in seconds, and nothing but the title ever leaves this file --
   the page's own bytes are never returned, so a blocked fetch cannot be used to read one.

   Nothing here reports a failure, and that is the whole contract: a shop that answers 403 to
   anything without a browser's headers, a page that has moved, a name that does not resolve,
   a site that is simply slow -- every one of them is "nothing found", because the reader is in
   the middle of typing and a wish does not need this to be saved. The fields are left alone and
   they carry on. Not a general web scraper either: only what a page states about itself for
   exactly this purpose is read (the tags a shop writes so a link to it previews properly);
   nothing is guessed from the address, and no picture is picked out of the page's body. */

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

/** Every address the host resolves to has to be public, not just the first one: a name with
    one public answer and one private one would otherwise be a way through.

    This leaves the gap every such check leaves -- the name is resolved here and again by the
    fetch below, and a name that answers differently between the two is not caught. Closing it
    means dialling the address ourselves, which is a different and much larger piece of code
    than this feature is worth. */
async function hostIsPublic(hostname) {
	if (isIP(hostname)) return isPublicAddress(hostname)
	try {
		const addresses = await lookup(hostname, { all: true, verbatim: true })
		return addresses.length > 0 && addresses.every(a => isPublicAddress(a.address))
	} catch {
		return false
	}
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" }

/** The content of the first <meta> naming any of `names`, in the order given. */
const metaContent = (html, names) => {
	for (const name of names) {
		const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`, 'i'))
		const content = tag && tag[0].match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
		if (content && content.trim()) return content.trim()
	}
	return null
}

const decode = text => text
	.replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#x27);/gi, (_, name) => ENTITIES[name.toLowerCase()] ?? _)
	.replace(/\s+/g, ' ')
	.trim()

/** The name a page gives itself: what it tells a link preview first, then its own <title>.
    Returns null when it says neither. */
export function titleFrom(html) {
	const raw = metaContent(html, ['og:title', 'twitter:title'])
		?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
	if (!raw) return null
	const text = decode(raw)
	// The wish's own name field takes 120 characters, and a page title that runs longer than
	// that is a sentence about the shop rather than a name for the thing.
	return text ? text.slice(0, 120) : null
}

/** The picture a page offers a link preview, as an address this server could go on to fetch --
    absolute, http(s), and resolved against the page it was found on, because a shop may write
    it as `/img/sko.jpg`. Only the tags written for previews are read: a shop that publishes one
    is offering it, which is a different thing from picking an image out of its page. */
export function imageFrom(html, pageUrl) {
	const raw = metaContent(html, ['og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image', 'twitter:image:src'])
	if (!raw) return null
	let at
	try { at = new URL(decode(raw), pageUrl) } catch { return null }
	if (at.protocol !== 'http:' && at.protocol !== 'https:') return null
	return at.href
}

/** What the page at `url` says about itself: `{ title, image }`, either of which may be null --
    for a refused address, an unreadable page, any status at all, or a page that just does not
    say. Never throws: every caller treats "no answer" and "nothing there" as the same thing,
    so there is nothing to tell apart. */
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
					'User-Agent': 'Spendly/1.0 (+wishlist link preview)',
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
		   may not send and may not mean. The body is dropped the moment the title is out of it. */
		const reader = res.body?.getReader()
		if (!reader) return NOTHING
		const decoder = new TextDecoder('utf-8')
		let html = '', bytes = 0
		try {
			for (;;) {
				const { done, value } = await reader.read()
				if (done) break
				bytes += value.byteLength
				html += decoder.decode(value, { stream: true })
				// Both answers live in <head>, so the read stops there rather than at </title>:
				// og:image is often written after the title tag.
				if (/<\/head>/i.test(html) || bytes >= MAX_BYTES) break
			}
		} finally {
			await reader.cancel().catch(() => {})
		}
		return { title: titleFrom(html), image: imageFrom(html, at) }
	}
	return NOTHING   // redirected past the cap
}

/* The picture itself, once the reader's wish is saved and there is a row to hang it on.

   Same guards as the page read above, for the same reason -- the address came off a page this
   server was pointed at, so it is no more trusted than the one that named it -- plus two of its
   own: the bytes have to say they are an image, and there is a ceiling on how many of them are
   read. Returns the bytes and their type, or null, which every caller treats as "no picture". */

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
				headers: { 'User-Agent': 'Spendly/1.0 (+wishlist link preview)', 'Accept': 'image/*' }
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
