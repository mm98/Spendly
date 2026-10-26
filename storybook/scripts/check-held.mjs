// A story must draw the same thing on every run, or Chromatic reports a change nobody made. The
// clock, random values and the language are held still around every story (.storybook/held.js), so
// a story reads them through that; one that reaches for the real ones itself, or fetches something
// over the network, escapes the hold and is stopped here. Run from storybook/: npm run held:check.

import { readdirSync, readFileSync } from 'node:fs'

const folders = ['stories', 'pages', '.storybook']
// held.js is the hold itself, and tests are not drawn
const skip = new Set(['held.js'])

const faults = [
	{
		find: /(?<![\w.])new (?:window\.)?Date\(\s*\)/g,
		say: 'new Date() reads the real date: write the day out, as 2026-08-14'
	},
	{
		find: /(?<![\w.])Date\.now\(\s*\)/g,
		say: 'Date.now() reads the real clock: write the moment out'
	},
	{
		find: /Math\.random\b/g,
		say: 'Math.random draws a different value each run: write the value out'
	},
	{
		find: /crypto\.(?:randomUUID|getRandomValues)\b/g,
		say: 'a random id differs each run: write the id out'
	},
	{
		find: /(?:src|href)\s*=\s*["'{`]?\s*https?:\/\//g,
		say: 'a file fetched over the network may not arrive in time: keep it in the repo or write it as a data: url',
		only: /src\s*=/
	},
	{
		find: /\burl\(\s*["']?https?:\/\//g,
		say: 'a file fetched over the network may not arrive in time: keep it in the repo or write it as a data: url'
	}
]

let found = 0
for (const folder of folders) {
	const at = new URL(`../${folder}/`, import.meta.url)
	for (const name of readdirSync(at)) {
		if (!/\.jsx?$/.test(name) || skip.has(name)) continue
		const text = readFileSync(new URL(name, at), 'utf8')
		const lines = text.split('\n')
		for (const fault of faults) {
			lines.forEach((line, i) => {
				if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return
				if (fault.only && !fault.only.test(line)) return
				if (!new RegExp(fault.find.source).test(line)) return
				console.error(`storybook/${folder}/${name}:${i + 1}: ${fault.say}`)
				found++
			})
		}
	}
}

if (found) console.error(`\n${found} place${found === 1 ? '' : 's'} a picture would come out differently from one run to the next.`)
process.exit(found ? 1 : 0)
