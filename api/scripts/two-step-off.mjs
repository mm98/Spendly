// For the person who runs the server, when someone has lost both their phone and their recovery codes:
//   docker exec spendly node api/scripts/two-step-off.mjs person@example.com
// Turns two-step sign-in off for that account, signs it out everywhere and emails it. The password stays.
import { db } from '../src/db.js'
import { sendTwoStepOff } from '../src/lib/notices.js'
import { securityLog } from '../src/lib/securityLog.js'
import { turnOffTwoStep, twoStepOn } from '../src/lib/twoStep.js'

const email = String(process.argv[2] ?? '').trim().toLowerCase()
if (!email) {
	console.error('Write the email address of the account: node api/scripts/two-step-off.mjs person@example.com')
	process.exit(1)
}
const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
if (!user) {
	console.error(`No account has the email address ${email}.`)
	process.exit(1)
}
if (!twoStepOn(user.id)) {
	console.log(`Two-step sign-in is already off for ${email}.`)
	process.exit(0)
}
db.transaction(() => {
	turnOffTwoStep(user.id)
	db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(user.id)
})()
securityLog(null, 'two-step-off', { email, userId: user.id, endedEverySession: true })
await sendTwoStepOff(null, user.id)
console.log(`Two-step sign-in is now off for ${email}. The account is signed out everywhere and can sign in with its password.`)
