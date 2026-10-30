import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { IntlMessageFormat } from 'intl-messageformat'
import { db } from '../db.js'
import { LANGUAGES } from './constants.js'

/* The server's words for the reader, one file per language in src/language, checked against each other
   by react/scripts/check-language-files.mjs. A phrase a file lacks is taken from en.json. */

const CODES = LANGUAGES.filter(code => code !== 'auto')
const files = Object.fromEntries(CODES.map(code => [code, JSON.parse(readFileSync(new URL(`../language/${code}.json`, import.meta.url), 'utf8'))]))
const formats = new Map()

/** The phrase under `key` in the language `code`, with `values` in its places (ICU message format). */
export function phraseIn(code, key, values) {
	const language = files[code] ? code : 'en'
	const message = files[language][key] ?? files.en[key]
	if (message === undefined) return key
	const id = `${language} ${key}`
	let format = formats.get(id)
	if (!format) formats.set(id, (format = new IntlMessageFormat(message, language)))
	return String(format.format(resolved(code, values)))
}

// the request being answered, so words written anywhere while it runs are in its reader's language
const answering = new AsyncLocalStorage()

/** Middleware: what runs for this request writes its words in the reader's language. A JSON answer is
    written inside the request too, since a body read from the network can resume outside it. */
export function inReadersLanguage(req, res, next) {
	const json = res.json.bind(res)
	res.json = body => answering.run(req, () => json(body))
	answering.run(req, next)
}

/** The language of the request being answered, or English with none (a log line, a timer). */
export const currentLanguage = () => {
	const req = answering.getStore()
	return req ? languageOf(req) : 'en'
}

/** Words waiting for a language: a key and its values, written out in the reader's language when they
    are sent or put in a sentence. */
export class Words {
	constructor(key, values) {
		this.key = key
		this.values = values
	}

	in(code) { return phraseIn(code, this.key, this.values) }
	toString() { return this.in(currentLanguage()) }
	toJSON() { return this.toString() }
}

export const words = (key, values) => new Words(key, values)

// a value that is itself words is written in the same language
const resolved = (code, values) => values && Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v instanceof Words ? v.in(code) : v]))

/** An error the reader is told about: its message is English for the log, and the central handler sends
    its words in the reader's language. */
export const refusal = (status, key, values) => Object.assign(new Error(phraseIn('en', key, values)), { status, words: words(key, values) })

const readLanguage = db.prepare('SELECT language FROM user_settings WHERE user_id = ?')

/** The language a request is answered in: the one the app shows, else the account's choice, else the
    browser's first language Spendly has, else English. */
export function languageOf(req) {
	const shown = req.get?.('X-Spendly-Language')
	if (CODES.includes(shown)) return shown
	return storedOr(req.user?.id, req)
}

/** An account's language for words sent with no app open, such as an email: its choice, else the
    browser of the request behind it, else English. */
export function storedOr(userId, req) {
	const stored = userId ? readLanguage.get(userId)?.language : null
	if (CODES.includes(stored)) return stored
	for (const tag of req?.acceptsLanguages?.() ?? []) {
		const code = tag.toLowerCase().split('-')[0]
		if (CODES.includes(code)) return code
	}
	return 'en'
}
