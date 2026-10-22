import { deflateRawSync, crc32 } from 'node:zlib'

function dosDateTime(date) {
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
	const day = (Math.max(date.getFullYear(), 1980) - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate()
	return { time, day }
}

/* A ZIP archive built by hand (a local header per file + central directory + EOCD) so the backup and
   the files Ask makes have no runtime dependency on a `zip` binary -- the production image (Dockerfile,
   node:22-bookworm-slim) never installs one. zlib.deflateRawSync and zlib.crc32 are both native
   to Node 22, so this is the whole of what a ZIP needs. `files` is [{ name, data }], in order. */
export function zipFiles(files, date = new Date()) {
	const { time, day } = dosDateTime(date)
	const locals = []
	const centrals = []
	let offset = 0
	for (const { name, data } of files) {
		const nameBuf = Buffer.from(name, 'utf8')
		const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data)
		const compressed = deflateRawSync(bytes)
		const crc = crc32(bytes)

		const local = Buffer.alloc(30)
		local.writeUInt32LE(0x04034b50, 0)
		local.writeUInt16LE(20, 4)          // version needed
		local.writeUInt16LE(0x0800, 6)      // flags: the name is UTF-8
		local.writeUInt16LE(8, 8)           // method: deflate
		local.writeUInt16LE(time, 10)
		local.writeUInt16LE(day, 12)
		local.writeUInt32LE(crc, 14)
		local.writeUInt32LE(compressed.length, 18)
		local.writeUInt32LE(bytes.length, 22)
		local.writeUInt16LE(nameBuf.length, 26)
		local.writeUInt16LE(0, 28)          // extra length

		const central = Buffer.alloc(46)
		central.writeUInt32LE(0x02014b50, 0)
		central.writeUInt16LE(20, 4)        // version made by
		central.writeUInt16LE(20, 6)        // version needed
		central.writeUInt16LE(0x0800, 8)    // flags: the name is UTF-8
		central.writeUInt16LE(8, 10)        // method: deflate
		central.writeUInt16LE(time, 12)
		central.writeUInt16LE(day, 14)
		central.writeUInt32LE(crc, 16)
		central.writeUInt32LE(compressed.length, 20)
		central.writeUInt32LE(bytes.length, 24)
		central.writeUInt16LE(nameBuf.length, 28)
		central.writeUInt16LE(0, 30)        // extra length
		central.writeUInt16LE(0, 32)        // comment length
		central.writeUInt16LE(0, 34)        // disk number start
		central.writeUInt16LE(0, 36)        // internal attrs
		central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attrs: -rw-r--r--
		central.writeUInt32LE(offset, 42)   // local header offset

		locals.push(local, nameBuf, compressed)
		centrals.push(central, nameBuf)
		offset += local.length + nameBuf.length + compressed.length
	}
	const centralSize = centrals.reduce((sum, b) => sum + b.length, 0)

	const eocd = Buffer.alloc(22)
	eocd.writeUInt32LE(0x06054b50, 0)
	eocd.writeUInt16LE(0, 4)            // disk number
	eocd.writeUInt16LE(0, 6)            // disk with central dir
	eocd.writeUInt16LE(files.length, 8) // entries on this disk
	eocd.writeUInt16LE(files.length, 10) // total entries
	eocd.writeUInt32LE(centralSize, 12)
	eocd.writeUInt32LE(offset, 16)
	eocd.writeUInt16LE(0, 20)           // comment length

	return Buffer.concat([...locals, ...centrals, eocd])
}

/** A ZIP archive holding one file: the backup. */
export const zipSingleFile = (name, data, date = new Date()) => zipFiles([{ name, data }], date)
