// Folds .design-sync/props/<Name>.txt (one hand-written <Name>Props body each) into
// cfg.dtsPropsFor. Kept as a file-per-component so parallel authoring never contends
// on config.json; run this, then rebuild.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROPS = '.design-sync/props';
const CFG = '.design-sync/config.json';
const cfg = JSON.parse(readFileSync(CFG, 'utf8'));
const out = {};
if (existsSync(PROPS)) {
	for (const f of readdirSync(PROPS).filter(n => n.endsWith('.txt')).sort()) {
		const body = readFileSync(join(PROPS, f), 'utf8').trim();
		if (body) out[f.replace(/\.txt$/, '')] = body + '\n';
	}
}
cfg.dtsPropsFor = out;
writeFileSync(CFG, JSON.stringify(cfg, null, '\t') + '\n');
console.error(`dtsPropsFor: ${Object.keys(out).length} component(s)`);
