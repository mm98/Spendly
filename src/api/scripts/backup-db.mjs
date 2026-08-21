import '../src/db.js'
import { backupDatabase } from '../src/lib/backup.js'

const zipPath = await backupDatabase()
console.log(`Backed up to ${zipPath}`)
