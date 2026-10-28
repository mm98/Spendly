import './logs.js'
import './db.js'
import { app } from './app.js'
import { finishAccountDeletions } from './lib/accountDeletion.js'
import { scheduleAskSweep } from './lib/ask.js'
import { scheduleDailyBackups } from './lib/backup.js'
import { checkMail } from './lib/mail.js'
import { scheduleStorageSweep } from './lib/storage.js'
import { scheduleStatusEmails } from './lib/statusEmail.js'

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`Spendly API listening on :${PORT}`))
scheduleDailyBackups()
checkMail()
scheduleStatusEmails()
scheduleAskSweep()
scheduleStorageSweep()
finishAccountDeletions()
