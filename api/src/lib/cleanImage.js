import sharp from 'sharp'
import { inflateSync } from 'node:zlib'

/* A picture at full size in its own format, with every tracking or device-naming block removed and
   the orientation applied first. Cut without re-encoding where the format allows; else encoded again. */

const STANDARD_PROFILE = /^(sRGB\b|sRGB IEC61966|Display P3\b)/i

/** The description an ICC profile gives itself, or null when it cannot be read. */
export function profileName(icc) {
	try {
		const count = icc.readUInt32BE(128)
		for (let i = 0; i < count; i++) {
			const at = 132 + i * 12
			if (icc.toString('latin1', at, at + 4) !== 'desc') continue
			const start = icc.readUInt32BE(at + 4)
			const type = icc.toString('latin1', start, start + 4)
			if (type === 'desc') return icc.toString('latin1', start + 12, start + 12 + icc.readUInt32BE(start + 8)).replace(/\0+$/, '')
			if (type === 'mluc') {
				const length = icc.readUInt32BE(start + 20), offset = icc.readUInt32BE(start + 24)
				return icc.subarray(start + offset, start + offset + length).swap16().toString('utf16le')
			}
		}
	} catch { /* a profile that cannot be read is not a standard one */ }
	return null
}
const standardProfile = icc => Boolean(icc?.length) && STANDARD_PROFILE.test(profileName(icc) ?? '')

/* ---- JPEG: keep the segments that draw the picture, cut the rest, end at the first image ---- */

// the tables and frame headers a decoder needs; APP14 "Adobe" only says how the colours are stored
const JPEG_KEEP = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf, 0xc4, 0xcc, 0xdb, 0xdd])

function cleanJpeg(buffer) {
	const kept = [buffer.subarray(0, 2)]
	const profile = []
	let at = 2
	while (at + 4 <= buffer.length) {
		if (buffer[at] !== 0xff) return null
		const marker = buffer[at + 1]
		if (marker === 0xff) { at++; continue }
		if (marker === 0xda) {
			// the scans run to the first end marker; anything after it (a second picture, a depth or gain map) is dropped
			const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), at)
			if (end < 0) return null
			if (profile.length && standardProfile(Buffer.concat(profile.map(s => s.subarray(18))))) kept.splice(1, 0, ...profile)
			kept.push(buffer.subarray(at, end + 2))
			return Buffer.concat(kept)
		}
		const segment = buffer.subarray(at, at + 2 + buffer.readUInt16BE(at + 2))
		if (JPEG_KEEP.has(marker)) kept.push(segment)
		else if (marker === 0xee && segment.toString('latin1', 4, 9) === 'Adobe') kept.push(segment)
		else if (marker === 0xe2 && segment.toString('latin1', 4, 16) === 'ICC_PROFILE\0') profile.push(segment)
		at += segment.length
	}
	return null
}

/* ---- PNG: keep the chunks that draw the picture ---- */

const PNG_KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'bKGD', 'acTL', 'fcTL', 'fdAT'])

function cleanPng(buffer) {
	const kept = [buffer.subarray(0, 8)]
	let at = 8
	while (at + 12 <= buffer.length) {
		const length = buffer.readUInt32BE(at)
		const type = buffer.toString('latin1', at + 4, at + 8)
		const chunk = buffer.subarray(at, at + 12 + length)
		if (PNG_KEEP.has(type)) kept.push(chunk)
		else if (type === 'iCCP') {
			const data = chunk.subarray(8, 8 + length)
			const nameEnd = data.indexOf(0)
			try { if (standardProfile(inflateSync(data.subarray(nameEnd + 2)))) kept.push(chunk) } catch { /* dropped */ }
		}
		at += chunk.length
		if (type === 'IEND') return Buffer.concat(kept)
	}
	return null
}

/* ---- WebP: drop the EXIF and XMP chunks, and a profile that is not standard ---- */

function cleanWebp(buffer) {
	if (buffer.toString('latin1', 12, 16) !== 'VP8X') return buffer
	const kept = []
	let flags = buffer[20] & ~0x0c
	let at = 12
	while (at + 8 <= buffer.length) {
		const type = buffer.toString('latin1', at, at + 4)
		const size = buffer.readUInt32LE(at + 4)
		const chunk = buffer.subarray(at, at + 8 + size + (size & 1))
		if (type === 'ICCP' && !standardProfile(chunk.subarray(8, 8 + size))) flags &= ~0x20
		else if (type !== 'EXIF' && type !== 'XMP ') kept.push(chunk)
		at += chunk.length
	}
	const body = Buffer.concat(kept)
	body[8] = flags
	const head = Buffer.from('RIFF0000WEBP', 'latin1')
	head.writeUInt32LE(body.length + 4, 4)
	return Buffer.concat([head, body])
}

/* ---- GIF: drop comments and every application block but the one that sets the looping ---- */

function cleanGif(buffer) {
	let at = 13
	const tableSize = flags => (flags & 0x80 ? 3 * 2 ** ((flags & 7) + 1) : 0)
	at += tableSize(buffer[10])
	const kept = [buffer.subarray(0, at)]
	const subBlocks = from => { let p = from; while (p < buffer.length && buffer[p] !== 0) p += buffer[p] + 1; return p + 1 }
	while (at < buffer.length) {
		const id = buffer[at]
		if (id === 0x3b) { kept.push(buffer.subarray(at, at + 1)); return Buffer.concat(kept) }
		if (id === 0x2c) {
			const end = subBlocks(at + 10 + tableSize(buffer[at + 9]) + 1)
			kept.push(buffer.subarray(at, end))
			at = end
		} else if (id === 0x21) {
			const label = buffer[at + 1]
			const end = subBlocks(at + 2)
			const loop = label === 0xff && /^(NETSCAPE2\.0|ANIMEXTS1\.0)$/.test(buffer.toString('latin1', at + 3, at + 14))
			if (label === 0xf9 || label === 0x01 || loop) kept.push(buffer.subarray(at, end))
			at = end
		} else return null
	}
	return null
}

const CUT = { 'image/jpeg': cleanJpeg, 'image/png': cleanPng, 'image/webp': cleanWebp, 'image/gif': cleanGif }

/** Encoded again at full size, turned upright, in the same format; only a standard Display P3
    profile is carried over, every other picture is converted to sRGB. */
async function encodeAgain(buffer, type, meta) {
	let image = sharp(buffer, { limitInputPixels: false }).rotate()
	if (/Display P3/i.test(meta.icc ? profileName(meta.icc) ?? '' : '')) image = image.withIccProfile('p3')
	if (type === 'image/jpeg') return image.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()
	if (type === 'image/png') return image.png({ compressionLevel: 9 }).toBuffer()
	if (type === 'image/webp') return image.webp({ quality: 95 }).toBuffer()
	if (type === 'image/avif') return image.avif({ quality: 80 }).toBuffer()
	if (type === 'image/tiff') return image.tiff({ compression: 'lzw' }).toBuffer()
	return null
}

/** `{ data, contentType }`: the cleaned picture, or null when it cannot be cleaned. */
export async function cleanOriginal(buffer, type) {
	let meta
	try { meta = await sharp(buffer, { limitInputPixels: false }).metadata() } catch { return null }
	const upright = !meta.orientation || meta.orientation === 1
	const cut = upright ? CUT[type]?.(buffer) : null
	const data = cut ?? await encodeAgain(buffer, type, meta).catch(() => null)
	return data ? { data, contentType: type } : null
}
