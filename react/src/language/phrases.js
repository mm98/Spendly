import { IntlMessageFormat } from 'intl-messageformat'
import { useSyncExternalStore } from 'react'

/* The languages Spendly's words can be shown in, in step with the server's LANGUAGES
   (api/src/lib/constants.js). A name is written in its own language, whatever language is in use. */
export const LANGUAGES = [
	{ code: 'en', name: 'English' },
	{ code: 'da', name: 'Dansk' }
]

/* One file per language, named by its code, downloaded only when that language is chosen. Every
   phrase a file lacks is filled in from en.json when it is loaded (languageFiles in vite.config.js). */
const files = import.meta.glob('./*.json', { import: 'default' })

/** What 'auto' stands for: the first of the browser's languages Spendly has, else English. */
export function browserLanguage() {
	for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
		const code = String(tag ?? '').toLowerCase().split('-')[0]
		if (LANGUAGES.some(l => l.code === code)) return code
	}
	return 'en'
}

let active = { code: null, phrases: {} }
const formats = new Map()
const listeners = new Set()

/** Loads and shows `choice` ('en', 'da', or 'auto' for the browser's). Resolves once every phrase is in. */
export async function setLanguage(choice) {
	const code = LANGUAGES.some(l => l.code === choice) ? choice : browserLanguage()
	if (code === active.code) return
	const phrases = await files[`./${code}.json`]()
	active = { code, phrases }
	formats.clear()
	document.documentElement.lang = code
	for (const listener of listeners) listener()
}

/** The code of the language in use. */
export const languageCode = () => active.code

/** The phrase under `key` with `values` in its places (ICU message format). A number is passed already
    written in the account's format; a plural choice reads the raw count. An unknown key comes back as itself. */
export function phrase(key, values) {
	const message = active.phrases[key]
	if (message === undefined) return key
	if (!message.includes('{')) return message
	let format = formats.get(key)
	if (!format) formats.set(key, (format = new IntlMessageFormat(message, active.code)))
	return format.format(values)
}

const subscribe = listener => {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

/** `phrase`, for a component that has to draw again when the language changes. */
export function usePhrase() {
	useSyncExternalStore(subscribe, () => active)
	return phrase
}
