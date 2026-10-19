import multer from 'multer'
import { MAX_UPLOAD_MB } from './constants.js'

// a request holds every file in memory until its route runs, so the count is capped beside the size
export const MAX_UPLOAD_FILES = 10

// defParamCharset: busboy reads file names as latin1 unless told, so "rengøringsplaner.pdf" would
// come back mojibake; browsers never send the encoding that would tell it otherwise
export const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: MAX_UPLOAD_FILES, fields: 20, parts: MAX_UPLOAD_FILES + 20 },
	defParamCharset: 'utf8'
})
