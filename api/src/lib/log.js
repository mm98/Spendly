/* One line per event: `<time> <LEVEL> [<area>] <message>`, the time in UTC ISO 8601.
   logFile.js tells these lines from other output by that start, so it must not change. */

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
const WIDTH = Math.max(...LEVELS.map(level => level.length))

/** The whole line, without its line break. A line break in the message is written as a space, so one event stays one line. */
export function logLine(level, area, message, at = new Date()) {
	return `${at.toISOString()} ${level.padEnd(WIDTH)} [${area}] ${String(message).replace(/\s*\n\s*/g, ' ')}`
}

/* `extra` is text that cannot be one line, such as a stack or an email shown instead of sent:
   it follows on its own lines, each indented, so every line that starts at the margin is an event. */
function write(level, area, message, extra) {
	const out = level === 'DEBUG' || level === 'INFO' ? console.log : console.error
	const indented = extra ? '\n' + String(extra).replace(/\n+$/, '').replace(/^/gm, '    ') : ''
	out(logLine(level, area, message) + indented)
}

/** The stack below an error's own first line, so the lines after the event say where it happened. */
const stackOf = error => error instanceof Error ? error.stack?.split('\n').slice(1).map(line => line.trimStart()).join('\n') : undefined

/** The error's own words, and its cause, which is where fetch keeps the reason. */
export const reasonOf = error => {
	const message = error?.message ?? String(error)
	const cause = error?.cause?.message ?? error?.cause
	return cause && cause !== message ? `${message} (${cause})` : message
}

/** Writes one event to the output, which logFile.js copies to the day file. `area` names the part of the server. */
export const log = {
	/* `extra`, on any level, is text shown below the line, indented. */
	debug: (area, message) => write('DEBUG', area, message),
	info: (area, message, extra) => write('INFO', area, message, extra),
	warn: (area, message, extra) => write('WARN', area, message, extra),
	error: (area, message, extra) => write('ERROR', area, message, extra),
	/** An error nobody planned for: the message, the error's reason, and its stack below the line. */
	fault: (area, message, error) => write('ERROR', area, `${message}: ${reasonOf(error)}`, stackOf(error))
}

/** True for a line `logLine` wrote, so the day file does not stamp it a second time. */
export const isLogLine = text => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z (DEBUG|INFO|WARN|ERROR|FATAL) /.test(text)
