/* A vendor's image (Images and files 17e): what the form refuses before sending it, in the words
   of the field's banner and help line. The server checks the same rules again. */

export const VENDOR_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/heic,image/svg+xml'
const MAX_MB = 5
const MIN_SIDE = 128
const MAX_SIDE = 8000
const MAX_PIXELS = 40_000_000

export const REFUSALS = {
	type: { banner: 'Not supported', help: 'Use a PNG, JPEG, WebP, HEIC or SVG file.' },
	large: { banner: 'Too large', help: 'The image is over 5 MB. Use a smaller file.' },
	huge: { banner: 'Too large', help: 'The image is too large to use. Use one under 8000 px.' },
	small: { banner: 'Too small', help: 'The image needs to be at least 128 px on its shorter side.' },
	failed: { banner: 'Failed', help: 'This file could not be read. Try another.' }
}

const ascii = text => [...text].map(c => c.charCodeAt(0))
const RASTERS = [
	[[0, [0xff, 0xd8, 0xff]]],
	[[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
	[[0, ascii('RIFF')], [8, ascii('WEBP')]],
	...['heic', 'heix', 'mif1'].map(brand => [[4, ascii('ftyp')], [8, ascii(brand)]])
]
const HEIC = RASTERS.slice(3)
const matches = (head, parts) => parts.every(([at, bytes]) => bytes.every((byte, i) => head[at + i] === byte))

/** The refusal for a picked file, from REFUSALS, or null when it can be sent. */
export async function inspectVendorImage(file) {
	let head
	try { head = new Uint8Array(await file.slice(0, 4096).arrayBuffer()) } catch { return REFUSALS.failed }
	const text = new TextDecoder().decode(head).replace(/^﻿/, '')
	const svg = /<svg[\s>]/i.test(text) && /^\s*(<\?xml|<!--|<!DOCTYPE|<svg)/i.test(text)
	const raster = RASTERS.some(parts => matches(head, parts))
	if (!svg && !raster) return REFUSALS.type
	if (file.size > MAX_MB * 1024 * 1024) return REFUSALS.large
	// a drawing has no pixel size of its own, and a browser that cannot open HEIC leaves it to the server
	if (svg || HEIC.some(parts => matches(head, parts))) return null
	let bitmap
	try { bitmap = await createImageBitmap(file) } catch { return REFUSALS.failed }
	const { width, height } = bitmap
	bitmap.close()
	if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) return REFUSALS.huge
	if (Math.min(width, height) < MIN_SIDE) return REFUSALS.small
	return null
}

/** The server's refusal reason ('type', 'large', 'small', 'failed') as the field words it. */
export const refusalOf = reason => REFUSALS[reason] ?? REFUSALS.failed
