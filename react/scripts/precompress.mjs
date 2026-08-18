#!/usr/bin/env node
/* Writes .gz and .br beside every text asset in dist/, and reports what the wire actually costs.

   Minifying is not compressing, and the build log's "gzip: 32.39 kB" is a number Vite computes
   and throws away -- nothing in dist/ was compressed. A static host that serves precompressed
   files (nginx `gzip_static` / `brotli_static`, Caddy, `http-server -g`) then has nothing to
   serve and either compresses every request on the fly or ships the raw bytes; brotli at
   quality 11 is far too slow to do per request, which is exactly why it is done here once.
   A host that compresses for you ignores these files, so writing them costs nothing but disk.

   Zero dependencies, as the rest of this port is: node:zlib is brotli and gzip both. The
   originals stay in place -- content negotiation needs the identity encoding to exist. */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
/* Anything already compressed (woff2, png, the fonts inside the CSS) gains nothing from a
   second pass and can lose to it. This list is what is worth the disk. */
const EXTENSIONS = new Set(['.js', '.css', '.html', '.json', '.svg', '.map', '.txt', '.webmanifest'])

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
	const full = path.join(dir, entry.name)
	return entry.isDirectory() ? walk(full) : [full]
})

if (!fs.existsSync(DIST)) {
	console.error('No dist/ to compress -- run `npm run build` first.')
	process.exit(1)
}

const files = walk(DIST).filter(f => EXTENSIONS.has(path.extname(f)))
let raw = 0, gz = 0, br = 0, written = 0

for (const file of files) {
	const source = fs.readFileSync(file)
	const gzip = zlib.gzipSync(source, { level: zlib.constants.Z_BEST_COMPRESSION })
	const brotli = zlib.brotliCompressSync(source, {
		params: {
			[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length
		}
	})
	raw += source.length
	/* A file that does not shrink is a file that would be served larger than it is. Skip it
	   rather than writing a variant the server would happily prefer. */
	if (gzip.length < source.length) { fs.writeFileSync(file + '.gz', gzip); gz += gzip.length; written++ }
	else gz += source.length
	if (brotli.length < source.length) { fs.writeFileSync(file + '.br', brotli); br += brotli.length; written++ }
	else br += source.length
}

const kb = n => (n / 1024).toFixed(2).padStart(8) + ' kB'
console.log(`precompressed ${files.length} files, ${written} variants written`)
console.log(`  identity ${kb(raw)}`)
console.log(`  gzip     ${kb(gz)}  ${(100 - 100 * gz / raw).toFixed(1)}% off`)
console.log(`  brotli   ${kb(br)}  ${(100 - 100 * br / raw).toFixed(1)}% off`)
