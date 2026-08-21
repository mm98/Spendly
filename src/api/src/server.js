import './db.js'
import { app } from './app.js'
import { scheduleDailyBackups } from './lib/backup.js'
import { scheduleDailyUploadCleanup } from './routes/scan.js'

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => console.log(`Spendly API listening on :${PORT}`))
scheduleDailyBackups()
scheduleDailyUploadCleanup()
