import { startLogFile } from './lib/logFile.js'

// imported first by server.js, so the file also holds what the other modules say while they load
if (process.env.SPENDLY_LOGS) startLogFile(process.env.SPENDLY_LOGS)
