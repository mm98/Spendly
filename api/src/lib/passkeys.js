import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

/** Where passkeys work: a passkey belongs to the site name it was made at, so only at SPENDLY_PUBLIC_URL. */
export function passkeySite() {
	try {
		const { origin, hostname } = new URL(process.env.SPENDLY_PUBLIC_URL)
		return { origin, rpID: hostname }
	} catch {
		return null
	}
}

// how long a device prompt may stay open before its answer is refused
const CHALLENGE_MS = 5 * 60 * 1000
// a sign-in prompt needs no account, so the open ones are capped against a flood of them
const MAX_OPEN = 1000
const open = new Map()   // key -> { challenge, at }, oldest first
// prompts to add a passkey, one per signed-in account, apart so a flood of sign-in prompts cannot push them out
const adding = new Map()
const storeOf = key => (key.startsWith('add:') ? adding : open)

/** Keeps the challenge a prompt was opened with until its answer comes back. */
export function keepChallenge(key, challenge) {
	const now = Date.now()
	const store = storeOf(key)
	for (const [k, kept] of store) {
		if (now - kept.at <= CHALLENGE_MS) break
		store.delete(k)
	}
	store.delete(key)
	store.set(key, { challenge, at: now })
	while (open.size > MAX_OPEN) open.delete(open.keys().next().value)
}

/** The challenge kept under `key`, once: null when there is none or it has run out. */
export function takeChallenge(key) {
	const store = storeOf(key)
	const kept = store.get(key)
	store.delete(key)
	return kept && Date.now() - kept.at <= CHALLENGE_MS ? kept.challenge : null
}

export const newTicket = () => randomBytes(16).toString('base64url')

/* Who made a passkey, by the AAGUID it reports: the names from passkeydeveloper/passkey-authenticator-aaguids
   (combined_aaguid.json). A passkey that reports none is named for the device it was added on. */
const MAKERS = JSON.parse(readFileSync(new URL('./aaguids.json', import.meta.url), 'utf8'))
const DEVICES = [[/iPhone/, 'iPhone'], [/iPad/, 'iPad'], [/Android/, 'Android'], [/CrOS/, 'Chromebook'],
	[/Macintosh/, 'Mac'], [/Windows/, 'Windows'], [/Linux/, 'Linux']]

/** The name a new passkey is listed under (Settings > Passkeys), which Rename can change. */
export const passkeyName = (aaguid, userAgent) =>
	MAKERS[aaguid] ?? DEVICES.find(([pattern]) => pattern.test(userAgent ?? ''))?.[1] ?? 'Passkey'
