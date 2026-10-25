// Stops a thread's next step when the user has had no status for 30 seconds. A message to the user
// (post_message, edit_message, request_decision) resets the clock; every other tool waits for one.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const LIMIT_SECONDS = 30
const SAYS = ['mcp__hearthbot__post_message', 'mcp__hearthbot__edit_message', 'mcp__hearthbot__request_decision']

let input = {}
try { input = JSON.parse(readFileSync(0, 'utf8')) } catch { process.exit(0) }
const tool = input.tool_name ?? ''
const dir = join(tmpdir(), 'spendly-status-guard')
mkdirSync(dir, { recursive: true })
const stamp = join(dir, `${input.session_id ?? 'session'}.txt`)
const now = Math.floor(Date.now() / 1000)

if (SAYS.includes(tool)) {
	writeFileSync(stamp, String(now))
	process.exit(0)
}
// the thread's own message tools and tool loading never wait, or the thread could not post at all
if (tool.startsWith('mcp__hearthbot__') || tool === 'ToolSearch') process.exit(0)

let last
try { last = Number(readFileSync(stamp, 'utf8')) } catch { writeFileSync(stamp, String(now)); process.exit(0) }
const quiet = now - last
if (quiet < LIMIT_SECONDS) process.exit(0)
process.stderr.write(`Stopped: the user has had no status for ${quiet} seconds. Post a one-line status with mcp__hearthbot__post_message first: what was just done and what runs next. Then repeat this step.\n`)
process.exit(2)
