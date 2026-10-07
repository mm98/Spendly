// Downloads the language model category suggestions use into SPENDLY_MODEL_DIR (the image build runs this once):
//   SPENDLY_MODEL_DIR=/app/models node api/scripts/fetch-model.mjs
import { readFileSync } from 'node:fs'
import { pipeline, env } from '@huggingface/transformers'

const MODEL = JSON.parse(readFileSync(new URL('../model.json', import.meta.url), 'utf8'))
const dir = process.env.SPENDLY_MODEL_DIR
if (!dir) { console.error('Say where to keep it: SPENDLY_MODEL_DIR=<folder>'); process.exit(1) }
env.cacheDir = dir
env.localModelPath = dir
env.allowRemoteModels = true
const extract = await pipeline('feature-extraction', MODEL.id, { dtype: MODEL.dtype })
const out = await extract(['Loftlampe', 'Ceiling lamp'], { pooling: 'mean', normalize: true })
if (out.dims[1] !== 384) throw new Error(`Unexpected vector size ${out.dims}`)
console.log(`${MODEL.id} is in ${dir}`)
