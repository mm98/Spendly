// Everything a picture must not depend on, held still, so two runs of the same code draw the same
// pixels. A component may read the clock, a random value or the machine's language; Storybook cannot
// change a component, so it changes what the component reads. Put around every story by
// .storybook/preview.jsx, and undone again after it.

// Captured while nothing is held yet: this file is loaded before any story runs.
const RealDate = Date
const RealDateTimeFormat = Intl.DateTimeFormat
const RealNumberFormat = Intl.NumberFormat
const REAL_TO_LOCALE = {
	toLocaleDateString: RealDate.prototype.toLocaleDateString,
	toLocaleTimeString: RealDate.prototype.toLocaleTimeString,
	toLocaleString: RealDate.prototype.toLocaleString
}
const realNumberToLocale = Number.prototype.toLocaleString

// The moment every story is drawn at. A Friday, mid-day UTC, so the local day is the same one in
// every timezone a machine taking the pictures might run in.
export const HELD_NOW = RealDate.parse('2026-08-14T12:00:00Z')
// What the app's formatters fall back to when no account has chosen a language: pinned, because the
// machine taking the pictures is not the machine the stories were written on.
export const HELD_LOCALE = 'da-DK'
export const HELD_ZONE = 'Europe/Copenhagen'

/** The clock, stopped. `new Date()` and `Date.now()` answer `at` until the undo is called. */
export function holdClock(at) {
	class Held extends RealDate {
		constructor(...parts) { super(...(parts.length ? parts : [at])) }
		static now() { return at }
	}
	globalThis.Date = Held
	return () => { globalThis.Date = RealDate }
}

/** `Math.random` and the browser's random bytes, replaced by one fixed series (mulberry32). */
function holdRandom(seed) {
	const realRandom = Math.random
	let state = seed
	const next = () => {
		state = (state + 0x6d2b79f5) | 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
	Math.random = next

	const undo = [() => { Math.random = realRandom }]
	const crypto = globalThis.crypto
	if (crypto?.getRandomValues) {
		const real = crypto.getRandomValues.bind(crypto)
		crypto.getRandomValues = bytes => {
			for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(next() * 256)
			return bytes
		}
		undo.push(() => { crypto.getRandomValues = real })
	}
	if (crypto?.randomUUID) {
		const real = crypto.randomUUID.bind(crypto)
		const hex = n => [...Array(n)].map(() => Math.floor(next() * 16).toString(16)).join('')
		crypto.randomUUID = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`
		undo.push(() => { crypto.randomUUID = real })
	}
	return () => undo.forEach(fn => fn())
}

/* One language and one timezone instead of the machine's own. A formatter asked for a language keeps
   it, so a story offering a choice of languages still shows that choice; one asked for none, which
   is where the machine's own would be read, gets these. */
function holdLocale(locale, timeZone) {
	const held = (Real, withZone) => {
		const Held = function (asked, options) { return new Real(asked ?? locale, withZone ? { timeZone, ...options } : options) }
		Held.prototype = Real.prototype
		Held.supportedLocalesOf = Real.supportedLocalesOf.bind(Real)
		return Held
	}
	Intl.DateTimeFormat = held(RealDateTimeFormat, true)
	Intl.NumberFormat = held(RealNumberFormat, false)
	for (const [name, real] of Object.entries(REAL_TO_LOCALE))
		RealDate.prototype[name] = function (asked, options) { return real.call(this, asked ?? locale, { timeZone, ...options }) }
	Number.prototype.toLocaleString = function (asked, options) { return realNumberToLocale.call(this, asked ?? locale, options) }

	return () => {
		Intl.DateTimeFormat = RealDateTimeFormat
		Intl.NumberFormat = RealNumberFormat
		for (const [name, real] of Object.entries(REAL_TO_LOCALE)) RealDate.prototype[name] = real
		Number.prototype.toLocaleString = realNumberToLocale
	}
}

/** Holds the clock, the random values and the language still. Returns the function that undoes it. */
export function holdEverythingStill({ at = HELD_NOW, seed = 20260814, locale = HELD_LOCALE, zone = HELD_ZONE } = {}) {
	const undo = [holdClock(at), holdRandom(seed), holdLocale(locale, zone)]
	return () => undo.reverse().forEach(fn => fn())
}
