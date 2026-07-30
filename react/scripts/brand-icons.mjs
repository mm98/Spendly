#!/usr/bin/env node
/* Builds the brand icon set in public/ from the mark in ../spendly.html.

   The sidebar mark is the only drawing this brand has, and icon files that restate its path,
   its geometry and its two gradient stops by hand are copies of the kind the uniformity rule
   is about: they agree until the day one of them is fixed, and nothing renders the
   disagreement. So they are not maintained by hand. Everything below is derived from the
   prototype's `.brand-mark` rules and markup -- glyph, radius, glyph fraction, stroke width,
   both stops -- and from `--bg-app` and `.topbar` for the manifest's two colours.

   `npm run icons:brand`        rewrites public/, and the one inline <link> the prototype
                                carries, since a single file cannot reference a file.
   `npm run icons:brand:check`  re-derives and fails on drift. Needs no browser.

   What --check can and cannot see: favicon.svg, site.webmanifest and the prototype's inline
   icon are text built from those numbers, so they are compared byte for byte and a brand
   change that did not reach here fails. The rasters are not re-drawn -- PNG bytes vary with
   the Chromium build that drew them, and a check that fails on a version bump is a check that
   gets switched off -- so they are verified for dimensions only, on the argument that they
   come off the same SVG that just passed. A change to the *glyph* that somehow left the SVG
   identical is the hole; there isn't one.

   Rasterising needs Playwright (`npx playwright install chromium`), the instrument the repo
   already measures with. Nothing in the build depends on this script: icons change when the
   brand does, which is roughly never. */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE = path.join(here, '..', '..', 'spendly.html')
const OUT = path.join(here, '..', 'public')
const check = process.argv.includes('--check')

/* ---------------- the mark, read out of the prototype ---------------- */

const html = fs.readFileSync(SOURCE, 'utf8')

/* Read, never retype. Every one of these throws rather than falling back on a default: a
   default here is how the icons would go on building, plausibly, off a rule that no longer
   says what they assume. */
const need = (re, what, subject = html) => {
	const m = subject.match(re)
	if (!m) throw new Error(`brand-icons: could not read ${what} out of spendly.html -- the rule it comes from moved or was renamed`)
	return m
}

const markRule = need(/\n\.brand-mark \{([^}]*)\}/, '.brand-mark')[1]
const glyphRule = need(/\n\.brand-mark svg \{([^}]*)\}/, '.brand-mark svg')[1]
const markup = need(/class="brand-mark"[^>]*><svg viewBox="0 0 (\d+) \d+"><path d="([^"]+)"/, 'the brand glyph')

const MARK = {
	size: +need(/width:(\d+)px/, '.brand-mark width', markRule)[1],
	radius: +need(/--radius-compact:(\d+)px/, '--radius-compact')[1],
	glyph: +need(/width:(\d+)px/, '.brand-mark svg width', glyphRule)[1],
	stroke: +need(/stroke-width:([\d.]+)/, 'the glyph stroke width', glyphRule)[1],
	ink: need(/stroke:(#[0-9a-fA-F]{3,6})/, 'the glyph colour', glyphRule)[1],
	box: +markup[1],
	path: markup[2],
	stops: need(/background:linear-gradient\(135deg,(#[0-9A-Fa-f]{6}) 0%,(#[0-9A-Fa-f]{6}) 100%\)/, 'the brand gradient', markRule).slice(1, 3),
}

/* The manifest's colours are the app's own surfaces, not a second opinion about them: the
   toolbar tint is what sits under the status bar (the sticky topbar) and the splash is the
   page. Both are read rather than typed, for the same reason the glyph is. */
const full = hex => hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex

const SURFACE = {
	/* Six digits even where the stylesheet writes three: index.html states the same colour in
	   a <meta name="theme-color">, and `#fff` here against `#ffffff` there is two spellings of
	   one value that a reader has to stop and compare. --check asserts they agree. */
	theme: full(need(/\n\.topbar \{[^}]*background:(#[0-9a-fA-F]{3,6})/, '.topbar background')[1]),
	splash: full(need(/--bg-app:(#[0-9a-fA-F]{3,6})/, '--bg-app')[1]),
}

/* ---------------- the artwork ---------------- */

const n = v => String(+v.toFixed(4))

/* Two artworks, not six. `rounded` is the mark as the sidebar draws it, corners and all, for
   anything that renders an icon as-is. `full` is the same drawing bled to the edges for the
   two platforms that apply their own mask -- iOS rounds the home-screen icon itself, and
   Android's maskable slot crops to whatever shape the launcher uses, so our corners inside
   theirs is a double round. The glyph fraction survives that crop: at 20/34 its ink measures
   0.63 of the icon across the diagonal, inside the 0.8 safe circle a maskable icon promises,
   so the maskable variant keeps the brand's own proportion instead of a shrunken one. */
const artwork = (size, bleed) => {
	const radius = bleed ? 0 : size * MARK.radius / MARK.size
	const side = size * MARK.glyph / MARK.size
	const inset = (size - side) / 2
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(size)} ${n(size)}" width="${n(size)}" height="${n(size)}">
	<defs>
		<linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="${MARK.stops[0]}"/>
			<stop offset="1" stop-color="${MARK.stops[1]}"/>
		</linearGradient>
	</defs>
	<rect width="${n(size)}" height="${n(size)}"${radius ? ` rx="${n(radius)}"` : ''} fill="url(#mark)"/>
	<g transform="translate(${n(inset)} ${n(inset)}) scale(${n(side / MARK.box)})" fill="none" stroke="${MARK.ink}" stroke-width="${n(MARK.stroke)}" stroke-linecap="round" stroke-linejoin="round">
		<path d="${MARK.path}"/>
	</g>
</svg>
`
}

const ROUNDED = artwork(32, false)
const FULL = artwork(32, true)

const MANIFEST = JSON.stringify({
	name: 'Spendly',
	short_name: 'Spendly',
	icons: [
		{ src: './android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
		{ src: './android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
		{ src: './android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
	],
	theme_color: SURFACE.theme,
	background_color: SURFACE.splash,
	display: 'standalone',
	/* Relative, like `base: './'` in vite.config.js and for the same reason: a dist that only
	   works when served from / would be a step down from the prototype, which opens from
	   anywhere. Both resolve against the manifest's own URL. */
	start_url: '.',
	scope: '.',
}, null, '\t') + '\n'

/* The prototype cannot reference a file, so its icon is the same drawing inline. Single
   quotes and a four-character escape set keep it legible in the source; `#` is the one that
   is not optional, since unescaped it starts a fragment and the gradient silently loses both
   stops. */
const INLINE_SVG = 'data:image/svg+xml,' + ROUNDED.replace(/\n\t*/g, '').replace(/"/g, "'")
	.replace(/[%#<>]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())

/* ---------------- .ico, assembled here ---------------- */

/* BMP-encoded rather than PNG-encoded. A PNG inside an .ico is a third of the bytes and is
   read by everything since IE11 -- but favicon.svg is what every modern browser takes, so
   this file exists for the consumers that are not modern, and the encoding they all read is
   this one. Rows run bottom-up, colours BGRA, and the 1bpp AND mask stays zero because a
   32-bit image carries its own alpha. */
const ico = images => {
	const dir = Buffer.alloc(6 + images.length * 16)
	dir.writeUInt16LE(0, 0)
	dir.writeUInt16LE(1, 2)
	dir.writeUInt16LE(images.length, 4)
	const blobs = images.map(({ size, rgba }) => {
		const xorRow = size * 4
		const andRow = Math.ceil(size / 8 / 4) * 4
		const xor = Buffer.alloc(xorRow * size)
		const and = Buffer.alloc(andRow * size)
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const s = ((size - 1 - y) * size + x) * 4
				const d = y * xorRow + x * 4
				xor[d] = rgba[s + 2]
				xor[d + 1] = rgba[s + 1]
				xor[d + 2] = rgba[s]
				xor[d + 3] = rgba[s + 3]
			}
		}
		const head = Buffer.alloc(40)
		head.writeUInt32LE(40, 0)
		head.writeInt32LE(size, 4)
		head.writeInt32LE(size * 2, 8)     // height counts the XOR and the AND mask together
		head.writeUInt16LE(1, 12)
		head.writeUInt16LE(32, 14)
		head.writeUInt32LE(xor.length + and.length, 20)
		return Buffer.concat([head, xor, and])
	})
	let at = dir.length
	blobs.forEach((blob, i) => {
		const e = 6 + i * 16
		dir.writeUInt8(images[i].size, e)
		dir.writeUInt8(images[i].size, e + 1)
		dir.writeUInt16LE(1, e + 4)
		dir.writeUInt16LE(32, e + 6)
		dir.writeUInt32LE(blob.length, e + 8)
		dir.writeUInt32LE(at, e + 12)
		at += blob.length
	})
	return Buffer.concat([dir, ...blobs])
}

/* ---------------- .png, encoded here too ---------------- */

/* Not the browser's PNG, because the browser's PNG is 2.4x the bytes: Chromium writes one
   filter for every scanline and deflates at its own default, and this artwork is the case
   that punishes both -- a smooth gradient, where the right per-row filter is most of the
   compression. Choosing the filter per row by the usual minimum-sum-of-absolute-differences
   heuristic and deflating at level 9 took the 512 from 90.4 KB to 37.3 KB and the 192 from
   16.8 to 9.0, for the same pixels: these are re-encodings of the exact RGBA the screenshot
   returned, not a redraw, so nothing about the image changes. */
const crcTable = (() => {
	const t = new Int32Array(256)
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
		t[n] = c
	}
	return t
})()

const chunk = (type, data) => {
	const head = Buffer.alloc(8)
	head.writeUInt32BE(data.length, 0)
	head.write(type, 4, 'latin1')
	let c = -1
	for (const byte of Buffer.concat([head.subarray(4), data])) c = crcTable[(c ^ byte) & 0xFF] ^ (c >>> 8)
	const tail = Buffer.alloc(4)
	tail.writeUInt32BE((c ^ -1) >>> 0, 0)
	return Buffer.concat([head, data, tail])
}

const encodePng = (rgba, size) => {
	const bpp = 4
	const stride = size * bpp
	const raw = Buffer.alloc((stride + 1) * size)
	const line = Buffer.alloc(stride)
	const best = Buffer.alloc(stride)
	let prev = Buffer.alloc(stride)
	for (let y = 0; y < size; y++) {
		const cur = Buffer.from(rgba.subarray(y * stride, (y + 1) * stride))
		let bestType = 0
		let bestScore = Infinity
		for (let f = 0; f < 5; f++) {
			let score = 0
			for (let i = 0; i < stride; i++) {
				const a = i >= bpp ? cur[i - bpp] : 0
				const b = prev[i]
				const c = i >= bpp ? prev[i - bpp] : 0
				let v
				if (f === 0) v = cur[i]
				else if (f === 1) v = cur[i] - a
				else if (f === 2) v = cur[i] - b
				else if (f === 3) v = cur[i] - ((a + b) >> 1)
				else {
					const p = a + b - c
					const pa = Math.abs(p - a)
					const pb = Math.abs(p - b)
					const pc = Math.abs(p - c)
					v = cur[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
				}
				line[i] = v &= 0xFF
				score += v < 128 ? v : 256 - v
			}
			if (score < bestScore) {
				bestScore = score
				bestType = f
				line.copy(best)
			}
		}
		raw[y * (stride + 1)] = bestType
		best.copy(raw, y * (stride + 1) + 1)
		prev = cur
	}
	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(size, 0)
	ihdr.writeUInt32BE(size, 4)
	ihdr[8] = 8      // 8 bits per channel
	ihdr[9] = 6      // truecolour with alpha
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
		chunk('IHDR', ihdr),
		chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
		chunk('IEND', Buffer.alloc(0)),
	])
}

/* ---------------- check ---------------- */

const png = buf => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) })

if (check) {
	const fail = []
	const cmp = (file, want) => {
		const at = path.join(OUT, file)
		if (!fs.existsSync(at)) return fail.push(`${file} is missing`)
		if (fs.readFileSync(at, 'utf8') !== want) fail.push(`${file} has drifted from the mark in spendly.html`)
	}
	cmp('favicon.svg', ROUNDED)
	cmp('site.webmanifest', MANIFEST)

	if (!html.includes(`href="${INLINE_SVG}"`))
		fail.push('spendly.html: the inline rel=icon data URI has drifted from its own .brand-mark rule')

	const meta = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
		.match(/<meta name="theme-color" content="([^"]*)">/)
	if (!meta) fail.push('index.html: the theme-color meta is missing')
	else if (meta[1] !== SURFACE.theme)
		fail.push(`index.html: theme-color is ${meta[1]}, but the manifest and .topbar say ${SURFACE.theme}`)

	for (const [file, size] of [['apple-touch-icon.png', 180], ['android-chrome-192x192.png', 192],
		['android-chrome-512x512.png', 512], ['android-chrome-maskable-512x512.png', 512]]) {
		const at = path.join(OUT, file)
		if (!fs.existsSync(at)) { fail.push(`${file} is missing`); continue }
		const got = png(fs.readFileSync(at))
		if (got.width !== size || got.height !== size) fail.push(`${file} is ${got.width}x${got.height}, expected ${size}x${size}`)
	}
	if (!fs.existsSync(path.join(OUT, 'favicon.ico'))) fail.push('favicon.ico is missing')

	if (fail.length) {
		console.error('brand icons have drifted from the mark:\n' + fail.map(f => '  - ' + f).join('\n'))
		console.error('\nrun `npm run icons:brand` to rebuild them')
		process.exit(1)
	}
	console.log('brand icons match the mark in spendly.html')
	process.exit(0)
}

/* ---------------- build ---------------- */

let chromium
try {
	chromium = createRequire(import.meta.url)('playwright').chromium
} catch {
	console.error('brand-icons: rasterising needs Playwright -- `npm i -D playwright && npx playwright install chromium`.')
	process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

/* Rasterise to RGBA once and let both encoders work off that. The screenshot is a transport,
   not an output: everything written below is encoded here, from these pixels. */
const render = async (svg, size) => {
	await page.setViewportSize({ width: size, height: size })
	await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>`
		+ svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${size}" height="${size}"`))
	const shot = await page.screenshot({ omitBackground: true })
	return Uint8Array.from(await page.evaluate(async ({ url, size }) => {
		const img = new Image()
		img.src = url
		await img.decode()
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = size
		const ctx = canvas.getContext('2d')
		ctx.drawImage(img, 0, 0)
		return [...ctx.getImageData(0, 0, size, size).data]
	}, { url: 'data:image/png;base64,' + shot.toString('base64'), size }))
}

const write = (file, data) => {
	fs.writeFileSync(path.join(OUT, file), data)
	console.log(`  ${file.padEnd(35)} ${(fs.statSync(path.join(OUT, file)).size / 1024).toFixed(1)} KB`)
}

console.log(`brand icons, from the ${MARK.size}px mark in spendly.html (${MARK.stops.join(' -> ')})`)

write('favicon.svg', ROUNDED)
write('site.webmanifest', MANIFEST)

const sizes = []
for (const size of [16, 32, 48]) sizes.push({ size, rgba: await render(ROUNDED, size) })
write('favicon.ico', ico(sizes))

write('apple-touch-icon.png', encodePng(await render(FULL, 180), 180))
write('android-chrome-192x192.png', encodePng(await render(ROUNDED, 192), 192))
write('android-chrome-512x512.png', encodePng(await render(ROUNDED, 512), 512))
write('android-chrome-maskable-512x512.png', encodePng(await render(FULL, 512), 512))

await browser.close()

/* And the prototype's tab icon, written rather than printed for someone to paste: a hand-copied
   data URI is a copy in the worst place to have one, since nothing renders the difference
   between it and the mark it came from. Only this one -- the installable sizes are all payload
   a single file opened from disk would carry and never spend. */
const patched = /<link rel="icon"/.test(html)
	? html.replace(/<link rel="icon" href="[^"]*">/, () => `<link rel="icon" href="${INLINE_SVG}">`)
	: html.replace(/<title>Spendly<\/title>\n/, m => m + `
<!-- The tab icon is inline because the file is one file -- no dependency, no build, no network,
     so there is nothing a <link href> could point at. It is generated from the .brand-mark rule
     below by react/scripts/brand-icons.mjs and is not edited here: a data URI copied by hand is
     a copy nothing renders the staleness of. It is 0.6KB and it is the whole set -- the home
     screen and install icons are 90KB of raster that a file:// page has no way to spend, and
     they live in the port, which can be installed. README: Chrome. -->
<link rel="icon" href="${INLINE_SVG}">
`)

if (patched !== html) {
	fs.writeFileSync(SOURCE, patched)
	console.log(`  ${'../spendly.html'.padEnd(35)} inline tab icon rewritten`)
}
