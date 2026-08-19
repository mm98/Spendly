import { deflateRawSync, crc32 } from 'node:zlib'

function dosDateTime(date) {
	const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
	const day = (Math.max(date.getFullYear(), 1980) - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate()
	return { time, day }
}

/* A ZIP archive holding one file, built by hand (local header + central directory + EOCD) so the
   backup has no runtime dependency on a `zip` binary -- the production image (Dockerfile,
   node:22-bookworm-slim) never installs one. zlib.deflateRawSync and zlib.crc32 are both native
   to Node 22, so this is the whole of what a single-entry ZIP needs. */
export function zipSingleFile(name, data, date = new Date()) {
	const nameBuf = Buffer.from(name, 'utf8')
	const compressed = deflateRawSync(data)
	const crc = crc32(data)
	const { time, day } = dosDateTime(date)

	const local = Buffer.alloc(30)
	local.writeUInt32LE(0x04034b50, 0)
	local.writeUInt16LE(20, 4)          // version needed
	local.writeUInt16LE(0, 6)           // flags
	local.writeUInt16LE(8, 8)           // method: deflate
	local.writeUInt16LE(time, 10)
	local.writeUInt16LE(day, 12)
	local.writeUInt32LE(crc, 14)
	local.writeUInt32LE(compressed.length, 18)
	local.writeUInt32LE(data.length, 22)
	local.writeUInt16LE(nameBuf.length, 26)
	local.writeUInt16LE(0, 28)          // extra length

	const central = Buffer.alloc(46)
	central.writeUInt32LE(0x02014b50, 0)
	central.writeUInt16LE(20, 4)        // version made by
	central.writeUInt16LE(20, 6)        // version needed
	central.writeUInt16LE(0, 8)         // flags
	central.writeUInt16LE(8, 10)        // method: deflate
	central.writeUInt16LE(time, 12)
	central.writeUInt16LE(day, 14)
	central.writeUInt32LE(crc, 16)
	central.writeUInt32LE(compressed.length, 20)
	central.writeUInt32LE(data.length, 24)
	central.writeUInt16LE(nameBuf.length, 28)
	central.writeUInt16LE(0, 30)        // extra length
	central.writeUInt16LE(0, 32)        // comment length
	central.writeUInt16LE(0, 34)        // disk number start
	central.writeUInt16LE(0, 36)        // internal attrs
	central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attrs: -rw-r--r--
	central.writeUInt32LE(0, 42)        // local header offset

	const centralOffset = local.length + nameBuf.length + compressed.length

	const eocd = Buffer.alloc(22)
	eocd.writeUInt32LE(0x06054b50, 0)
	eocd.writeUInt16LE(0, 4)            // disk number
	eocd.writeUInt16LE(0, 6)            // disk with central dir
	eocd.writeUInt16LE(1, 8)            // entries on this disk
	eocd.writeUInt16LE(1, 10)           // total entries
	eocd.writeUInt32LE(central.length + nameBuf.length, 12)
	eocd.writeUInt32LE(centralOffset, 16)
	eocd.writeUInt16LE(0, 20)           // comment length

	return Buffer.concat([local, nameBuf, compressed, central, nameBuf, eocd])
}
