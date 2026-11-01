import { mkdirSync, openSync, writeSync, closeSync, statSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { todayIso } from './dates.js'
import { isLogLine, logLine } from './log.js'

const KEEP_DAYS = 30
// a day's file stops here, so a log that runs away cannot fill the disk
const MAX_BYTES_PER_DAY = 50 * 1024 * 1024
const FILE_NAME = /^spendly-\d{4}-\d{2}-\d{2}\.log$/

// Copies the output into one stamped file a day; a folder that cannot be written is said once and the app runs on.
export function startLogFile(dir, { now = () => new Date(), keepDays = KEEP_DAYS, maxBytesPerDay = MAX_BYTES_PER_DAY } = {}) {
	const streams = [process.stdout, process.stderr]
	const originals = streams.map(stream => stream.write)
	const warn = message => originals[1].call(process.stderr, `${logLine('WARN', 'log', message, now())}\n`)
	let day = null
	let fd = null
	let bytes = 0
	let full = false

	function openDay(today) {
		if (fd !== null) closeSync(fd)
		const file = path.join(dir, `spendly-${today}.log`)
		fd = openSync(file, 'a')
		day = today
		bytes = statSync(file).size
		full = false
		pruneOldFiles(dir, keepDays)
	}

	try {
		mkdirSync(dir, { recursive: true })
		openDay(todayIso(now()))
	} catch (e) {
		warn(`Logs are not saved in ${dir}, only shown here: ${e.message}`)
		return () => {}
	}

	/* A line from log.js is copied as it is. Anything else (Node's own warnings, a library, a crash)
	   is given the same time, level and area, and its further lines are indented below it. */
	const asLogLines = (text, level, at) => isLogLine(text) ? text.replace(/\n+$/, '')
		: text.replace(/\n+$/, '').split('\n').map((line, i) => i === 0 ? logLine(level, 'output', line, at) : `    ${line}`).join('\n')
	const levelOf = (text, fromStderr) => !fromStderr ? 'INFO' : /warning/i.test(text) ? 'WARN' : 'ERROR'

	function copy(chunk, encoding, fromStderr, level) {
		if (fd === null) return
		try {
			const at = now()
			const today = todayIso(at)
			if (today !== day) openDay(today)
			if (full) return
			const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8')
			const line = `${asLogLines(text, level ?? levelOf(text, fromStderr), at)}\n`
			const size = Buffer.byteLength(line)
			if (bytes + size > maxBytesPerDay) {
				full = true
				writeSync(fd, `${logLine('WARN', 'log', 'The log for today is full. It goes on tomorrow.', at)}\n`)
				return
			}
			writeSync(fd, line)
			bytes += size
		} catch (e) {
			// one failure stops the file for good; the output must never break because of it
			try { closeSync(fd) } catch {}
			fd = null
			warn(`Logs are no longer saved in ${dir}: ${e.message}`)
		}
	}

	// a crash is printed by Node itself, past the output's write, so it is copied here
	const onCrash = error => copy(`${error?.stack ?? error}\n`, 'utf8', true, 'FATAL')
	process.on('uncaughtExceptionMonitor', onCrash)
	streams.forEach((stream, i) => {
		stream.write = function (chunk, encoding, callback) {
			copy(chunk, encoding, stream === process.stderr)
			return originals[i].call(stream, chunk, encoding, callback)
		}
	})

	return () => {
		process.off('uncaughtExceptionMonitor', onCrash)
		streams.forEach((stream, i) => { stream.write = originals[i] })
		if (fd !== null) closeSync(fd)
		fd = null
	}
}

/** Removes the day files beyond the newest `keepDays`. Names sort by date, so the oldest go first. */
function pruneOldFiles(dir, keepDays) {
	const files = readdirSync(dir).filter(name => FILE_NAME.test(name)).sort()
	for (const name of files.slice(0, Math.max(0, files.length - keepDays))) rmSync(path.join(dir, name), { force: true })
}
