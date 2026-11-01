import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { detectFileType } from './fileType.js'
import { toSquare, toWide } from './images.js'
import { log } from './log.js'

/* A vendor's image (Images and files 17e): checked, then cut into the renditions the pages draw.
   Every refusal carries one of the reasons the vendor form names. */

export const VENDOR_IMAGE_MAX_MB = 5
const MIN_SIDE = 128
const MAX_SIDE = 8000
const MAX_PIXELS = 40_000_000
const SVG_RASTER = 1024
const RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export class VendorImageRefusal extends Error {
	constructor(reason) {
		super(reason)
		this.reason = reason
	}
}
const refuse = reason => { throw new VendorImageRefusal(reason) }

const looksLikeSvg = buffer => /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>\s*)*<svg[\s>]/i
	.test(buffer.subarray(0, 4096).toString('utf8').replace(/^\uFEFF/, ''))

/* Scripts, event handlers, foreignObject, the doctype and every reference outside the file are
   taken out before the picture is drawn; a file that declares its own entities is refused. */
const KEPT_HREF = /^\s*(#|data:image\/(png|jpeg|gif|webp);base64,)/i
export function sanitiseSvg(text) {
	if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(text)) refuse('failed')
	return text
		.replace(/<!DOCTYPE[^>]*>/gi, '')
		.replace(/<([\w-]+:)?(script|foreignObject)\b[\s\S]*?<\/\1?\2\s*>/gi, '')
		.replace(/<([\w-]+:)?(script|foreignObject)\b[^>]*\/>/gi, '')
		.replace(/\son[\w-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
		.replace(/\s((?:[\w-]+:)?href)\s*=\s*("([^"]*)"|'([^']*)')/gi, (attr, _name, _quoted, dq, sq) => (KEPT_HREF.test(dq ?? sq) ? attr : ''))
		.replace(/@import[^;]*;?/gi, '')
		.replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, 'none')
}

async function rasteriseSvg(buffer) {
	const clean = Buffer.from(sanitiseSvg(buffer.toString('utf8')))
	let meta
	try { meta = await sharp(clean).metadata() } catch { refuse('failed') }
	const longest = Math.max(meta.width ?? 0, meta.height ?? 0)
	if (!longest) refuse('failed')
	// drawn at the density that gives the longest side SVG_RASTER pixels, never served as SVG
	const density = Math.min(72 * SVG_RASTER / longest, 2400)
	try {
		return await sharp(clean, { density }).resize(SVG_RASTER, SVG_RASTER, { fit: 'inside' }).png().toBuffer()
	} catch { refuse('failed') }
}

/** { hash, square256, wide1080 } for an upload, or a
    VendorImageRefusal whose `reason` is 'type', 'large', 'small' or 'failed'. */
export async function processVendorImage(buffer) {
	if (!buffer?.length) refuse('failed')
	if (buffer.length > VENDOR_IMAGE_MAX_MB * 1024 * 1024) refuse('large')
	const detected = detectFileType(buffer)
	const svg = !detected && looksLikeSvg(buffer)
	if (!svg && !RASTER_TYPES.has(detected?.type)) refuse('type')
	const source = svg ? await rasteriseSvg(buffer) : buffer
	let meta
	try { meta = await sharp(source, { limitInputPixels: false }).metadata() } catch { refuse('failed') }
	const width = meta.width ?? 0, height = meta.height ?? 0
	if (!width || !height) refuse('failed')
	// checked from the header, before the whole picture is decoded
	if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) refuse('large')
	if (!svg && Math.min(width, height) < MIN_SIDE) refuse('small')
	try {
		const [square256, wide1080] = await Promise.all([toSquare(source), toWide(source)])
		return {
			hash: createHash('sha256').update(buffer).digest('hex'),
			square256, wide1080
		}
	} catch (e) {
		if (e instanceof VendorImageRefusal) throw e
		log.error('picture', `A shop picture could not be made: ${e.message}`)
		refuse('failed')
	}
}
