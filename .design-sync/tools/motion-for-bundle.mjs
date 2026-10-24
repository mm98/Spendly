// The converter's bundle reads every .js as plain JS, but react/src/components/motion.js holds JSX.
// This writes a JSX-free copy to .cache/; bundle-tsconfig.json points './motion.js' at it.
// Run before every build: node .design-sync/tools/motion-for-bundle.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '../../.ds-sync/node_modules/esbuild/lib/main.js'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '../../react/src/components/motion.js')
const out = join(here, '../.cache/motion.js')
const { code } = transformSync(readFileSync(source, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: source })
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, code)
console.log(`wrote ${out}`)
