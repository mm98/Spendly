import { readFileSync } from 'node:fs'
import path from 'node:path'
import { startLogFile } from './lib/logFile.js'

// imported first by server.js, so the file also holds what the other modules say while they load
const dir = process.env.SPENDLY_LOGS
if (!dir) {
	console.log('Log file: off, the log is only shown here. Set SPENDLY_LOGS to a folder to keep a copy.')
} else if (startLogFile(dir)) {
	console.log(`Log file: saved in ${dir}, one file a day.`)
	if (isInsideContainer(dir)) console.warn(`Log file warning: ${dir} is not a folder on the server, so the files are lost when the container is replaced. Add the ${dir} volume and create the container again.`)
}

/** True when the folder sits in a Docker container's own disk rather than in a mounted folder. */
function isInsideContainer(folder) {
	let mounts
	try {
		mounts = readFileSync('/proc/self/mountinfo', 'utf8')
	} catch {
		return false
	}
	const lines = mounts.split('\n').map(line => line.split(' ')).filter(fields => fields.length > 4)
	const root = lines.find(fields => fields[4] === '/')
	// a container's own disk is an overlay; anything else is a plain machine, where every folder is real
	if (root?.[root.indexOf('-') + 1] !== 'overlay') return false
	const mountPoints = new Set(lines.map(fields => fields[4]))
	for (let at = path.resolve(folder); at !== '/'; at = path.dirname(at)) if (mountPoints.has(at)) return false
	return true
}
