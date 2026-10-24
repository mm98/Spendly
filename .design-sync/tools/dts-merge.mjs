// Merges .design-sync/.cache/dts.json into dtsPropsFor: new props are added, props the JSDoc does not name are kept.
import fs from 'node:fs'
const cfgPath = '.design-sync/config.json'
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
const fresh = JSON.parse(fs.readFileSync('.design-sync/.cache/dts.json', 'utf8'))
const src = fs.readdirSync('react/src/components').filter(f => /\.jsx?$/.test(f)).map(f => fs.readFileSync('react/src/components/' + f, 'utf8')).join('\n')
// split a props body on top-level ';'
const split = body => { const out = []; let d = 0, cur = ''; for (const c of body) { if ('{(['.includes(c)) d++; if ('})]'.includes(c) && d) d--; if (c === ';' && !d) { if (cur.trim()) out.push(cur.trim()); cur = '' } else cur += c } if (cur.trim()) out.push(cur.trim()); return out }
const keyOf = p => p.match(/^('[^']+'|[\w$]+)\??\s*:/)?.[1].replace(/'/g, '')
const report = []
for (const name of Object.keys(cfg.dtsPropsFor)) {
	if (!fresh[name]) { report.push(`${name}: no JSDoc, kept as is`); continue }
	const now = split(fresh[name]), seen = new Set(now.map(keyOf))
	const kept = split(cfg.dtsPropsFor[name]).filter(p => { const k = keyOf(p); return k && !seen.has(k) && new RegExp(`['"\\b]${k.replace(/[-]/g, '\\-')}['"\\b:]|\\b${k}\\b`).test(src) })
	const dropped = split(cfg.dtsPropsFor[name]).map(keyOf).filter(k => k && !seen.has(k) && !kept.some(p => keyOf(p) === k))
	const body = [...now, ...kept].join('; ')
	if (body !== cfg.dtsPropsFor[name]) report.push(`${name}: +${[...seen].filter(k => !split(cfg.dtsPropsFor[name]).some(p => keyOf(p) === k)).join(',')} kept:${kept.map(keyOf).join(',')} dropped:${dropped.join(',')}`)
	cfg.dtsPropsFor[name] = body
}
for (const n of ['Records', 'TokensField']) { delete cfg.dtsPropsFor[n]; delete cfg.overrides[n] }
cfg.componentSrcMap.Leaving = null; cfg.componentSrcMap.Leaves = null
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, '\t') + '\n')
console.log(report.join('\n'))
