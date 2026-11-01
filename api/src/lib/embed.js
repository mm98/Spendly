import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { foldName } from './names.js'
import { log } from './log.js'

/* What an item's name means, as a vector, from a multilingual language model run in this process (the image
   keeps its files); without them, from word shapes, which relate names of one language only. */

export const DIM = 384
// which model and how it is stored: api/model.json, which the image build reads too
export const MODEL = JSON.parse(readFileSync(new URL('../../model.json', import.meta.url), 'utf8'))
export const MODEL_DIR = process.env.SPENDLY_MODEL_DIR || fileURLToPath(new URL('../../.models', import.meta.url))
const LOAD_MS = 60_000

const hash = text => {
	let h = 2166136261
	for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
	return h >>> 0
}

/** The shapes of an item name's words (the words and their four-letter pieces), spread over DIM numbers and scaled to length 1. */
function shapes(title) {
	const v = new Float32Array(DIM)
	for (const word of foldName(title).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2 && !/^\d+$/.test(w))) {
		v[hash('w:' + word) % DIM] += 1
		if (word.length >= 5) for (let i = 0; i + 4 <= word.length + 2; i++) v[hash('c:' + `^${word}$`.slice(i, i + 4)) % DIM] += 0.5
	}
	return unit(v)
}

function unit(v) {
	let s = 0
	for (const x of v) s += x * x
	if (s > 0) { const n = Math.sqrt(s); for (let i = 0; i < v.length; i++) v[i] /= n }
	return v
}

export const FALLBACK_ID = 'shapes-1'
const FALLBACK = { id: FALLBACK_ID, embed: async texts => texts.map(shapes) }

let loading = null
async function load() {
	try {
		const { pipeline, env } = await import('@huggingface/transformers')
		env.cacheDir = MODEL_DIR
		env.localModelPath = MODEL_DIR
		// the image has the files; nothing is fetched while it runs, unless a dev machine asks for it
		env.allowRemoteModels = process.env.SPENDLY_DOWNLOAD_MODEL === '1'
		const extract = await pipeline('feature-extraction', MODEL.id, { dtype: MODEL.dtype })
		return {
			id: 'minilm-l12-multilingual-q8',
			embed: async texts => {
				const out = await extract(texts, { pooling: 'mean', normalize: true })
				return texts.map((unused, i) => Float32Array.from(out.data.subarray(i * DIM, (i + 1) * DIM)))
			}
		}
	} catch (error) {
		log.warn('categories', `The language model for category suggestions was not loaded, so word shapes are used instead: ${error.message}`)
		return null
	}
}

/** The embedder in use: the language model once it has loaded, else the word shapes. Never throws. */
export async function embedder() {
	if (process.env.SPENDLY_EMBEDDER === 'shapes') return FALLBACK
	loading ??= Promise.race([load(), new Promise(resolve => setTimeout(() => resolve(null), LOAD_MS))])
	return (await loading) ?? FALLBACK
}
