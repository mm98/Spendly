import './db.js'
import { app } from './app.js'
import { scheduleAssistantSweep } from './lib/assistant.js'
import { scheduleDailyBackups } from './lib/backup.js'
import { checkMail } from './lib/mail.js'
import { scheduleStatusEmails } from './lib/statusEmail.js'

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`Spendly API listening on :${PORT}`))
scheduleDailyBackups()
checkMail()
scheduleStatusEmails()
scheduleAssistantSweep()
