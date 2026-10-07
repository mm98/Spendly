// How well one account's own orders predict categories, on a held-out check:
//   SPENDLY_DB=/path/to.sqlite3 node scripts/check-suggestions.mjs <email>
// Prints the embedder in use, how many items it learned from and the bar it must clear.
import { db } from '../src/db.js'
import { standing } from '../src/lib/categoryModel.js'

const user = db.prepare('SELECT id FROM users WHERE email = ?').get(process.argv[2])
if (!user) { console.error('No such account.'); process.exit(1) }
let last = -1
for (let round = 0; round < 40; round++) {
	const s = await standing(user.id)
	if (s.examples === last && round > 0) { console.log(JSON.stringify(s)); process.exit(0) }
	last = s.examples
	await new Promise(resolve => setTimeout(resolve, 2500))
}
console.log('still embedding names; run it again')
process.exit(0)
