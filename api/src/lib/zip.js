import { deflateRawSync, crc32 } from 'node:zlib'
import { once } from 'node:events'

function dosDateTime(date) {
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
	const day = (Math.max(date.getFullYear(), 1980) - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate()
	return { time, day }
}

// past these a field cannot hold the value, and the ZIP64 records carry it instead
const MAX_16 = 0xffff
const MAX_32 = 0xffffffff

/* A ZIP archive built by hand (a local header per file + central directory + EOCD) so the backup and
   the files Ask makes have no runtime dependency on a `zip` binary -- the production image (Dockerfile,
   node:22-bookworm-slim) never installs one. zlib.deflateRawSync and zlib.crc32 are both native
   to Node 22, so this is the whole of what a ZIP needs. One file's size stays under 4 GB; the archive,
   its offsets and its count of files may pass the 32-bit and 16-bit fields, with ZIP64 records. */
function zipEntry(name, data, offset, { time, day }) {
	const nameBuf = Buffer.from(name, 'utf8')
	const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data)
	const compressed = deflateRawSync(bytes)
	const crc = crc32(bytes)
	const far = offset >= MAX_32

	const local = Buffer.alloc(30)
	local.writeUInt32LE(0x04034b50, 0)
	local.writeUInt16LE(far ? 45 : 20, 4) // version needed
	local.writeUInt16LE(0x0800, 6)      // flags: the name is UTF-8
	local.writeUInt16LE(8, 8)           // method: deflate
	local.writeUInt16LE(time, 10)
	local.writeUInt16LE(day, 12)
	local.writeUInt32LE(crc, 14)
	local.writeUInt32LE(compressed.length, 18)
	local.writeUInt32LE(bytes.length, 22)
	local.writeUInt16LE(nameBuf.length, 26)
	local.writeUInt16LE(0, 28)          // extra length

	// the ZIP64 extra field, holding the local header's offset when 32 bits cannot
	const extra = far ? Buffer.alloc(12) : Buffer.alloc(0)
	if (far) {
		extra.writeUInt16LE(0x0001, 0)
		extra.writeUInt16LE(8, 2)
		extra.writeBigUInt64LE(BigInt(offset), 4)
	}

	const central = Buffer.alloc(46)
	central.writeUInt32LE(0x02014b50, 0)
	central.writeUInt16LE(far ? 45 : 20, 4) // version made by
	central.writeUInt16LE(far ? 45 : 20, 6) // version needed
	central.writeUInt16LE(0x0800, 8)    // flags: the name is UTF-8
	central.writeUInt16LE(8, 10)        // method: deflate
	central.writeUInt16LE(time, 12)
	central.writeUInt16LE(day, 14)
	central.writeUInt32LE(crc, 16)
	central.writeUInt32LE(compressed.length, 20)
	central.writeUInt32LE(bytes.length, 24)
	central.writeUInt16LE(nameBuf.length, 28)
	central.writeUInt16LE(extra.length, 30) // extra length
	central.writeUInt16LE(0, 32)        // comment length
	central.writeUInt16LE(0, 34)        // disk number start
	central.writeUInt16LE(0, 36)        // internal attrs
	central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attrs: -rw-r--r--
	central.writeUInt32LE(far ? MAX_32 : offset, 42)   // local header offset

	return { local: Buffer.concat([local, nameBuf, compressed]), central: Buffer.concat([central, nameBuf, extra]) }
}

/** The records after the central directory: EOCD, with the ZIP64 record and locator before it when a field overflows. */
function zipEnd(count, centralSize, centralOffset) {
	const wide = count >= MAX_16 || centralSize >= MAX_32 || centralOffset >= MAX_32
	const eocd = Buffer.alloc(22)
	eocd.writeUInt32LE(0x06054b50, 0)
	eocd.writeUInt16LE(0, 4)            // disk number
	eocd.writeUInt16LE(0, 6)            // disk with central dir
	eocd.writeUInt16LE(wide ? MAX_16 : count, 8) // entries on this disk
	eocd.writeUInt16LE(wide ? MAX_16 : count, 10) // total entries
	eocd.writeUInt32LE(wide ? MAX_32 : centralSize, 12)
	eocd.writeUInt32LE(wide ? MAX_32 : centralOffset, 16)
	eocd.writeUInt16LE(0, 20)           // comment length
	if (!wide) return eocd

	const record = Buffer.alloc(56)
	record.writeUInt32LE(0x06064b50, 0)
	record.writeBigUInt64LE(44n, 4)     // size of the rest of this record
	record.writeUInt16LE(45, 12)        // version made by
	record.writeUInt16LE(45, 14)        // version needed
	record.writeUInt32LE(0, 16)         // disk number
	record.writeUInt32LE(0, 20)         // disk with central dir
	record.writeBigUInt64LE(BigInt(count), 24)
	record.writeBigUInt64LE(BigInt(count), 32)
	record.writeBigUInt64LE(BigInt(centralSize), 40)
	record.writeBigUInt64LE(BigInt(centralOffset), 48)

	const locator = Buffer.alloc(20)
	locator.writeUInt32LE(0x07064b50, 0)
	locator.writeUInt32LE(0, 4)         // disk with the ZIP64 record
	locator.writeBigUInt64LE(BigInt(centralOffset + centralSize), 8)
	locator.writeUInt32LE(1, 16)        // total disks
	return Buffer.concat([record, locator, eocd])
}

/** A ZIP archive of `files`, [{ name, data }] in order, as one buffer. */
export function zipFiles(files, date = new Date()) {
	const stamp = dosDateTime(date)
	const locals = []
	const centrals = []
	let offset = 0
	for (const { name, data } of files) {
		const { local, central } = zipEntry(name, data, offset, stamp)
		locals.push(local)
		centrals.push(central)
		offset += local.length
	}
	const centralSize = centrals.reduce((sum, b) => sum + b.length, 0)
	return Buffer.concat([...locals, ...centrals, zipEnd(files.length, centralSize, offset)])
}

/** Writes a ZIP archive of `files`, an iterable or async iterable of { name, data }, to the stream `out`,
    one file at a time, so an archive larger than memory is never held whole. Resolves once it is all written. */
export async function streamZip(out, files, date = new Date()) {
	const stamp = dosDateTime(date)
	const centrals = []
	let offset = 0
	const write = async chunk => { if (!out.write(chunk)) await once(out, 'drain') }
	for await (const { name, data } of files) {
		const { local, central } = zipEntry(name, data, offset, stamp)
		await write(local)
		centrals.push(central)
		offset += local.length
	}
	const centralSize = centrals.reduce((sum, b) => sum + b.length, 0)
	for (const central of centrals) await write(central)
	await write(zipEnd(centrals.length, centralSize, offset))
}

/** A ZIP archive holding one file: the backup. */
export const zipSingleFile = (name, data, date = new Date()) => zipFiles([{ name, data }], date)
