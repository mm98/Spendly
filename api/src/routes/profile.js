import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { db } from '../db.js'
import { hashPassword, verifyPassword } from '../lib/auth.js'
import { MAX_UPLOAD_MB } from '../lib/constants.js'
import { nowEpoch } from '../lib/dates.js'
import { detectFileType } from '../lib/fileType.js'
import { MAX_NAME, MIN_PASSWORD, cleanName } from './auth.js'

/* The account's own profile (Settings 11a): name, picture, password, and the first run's end. */
export const router = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }, defParamCharset: 'utf8' })

// the smallest picture the card accepts, and the square it is stored at
const MIN_PICTURE = 128
const PICTURE_SIZE = 256

const setName = db.prepare('UPDATE users SET name = ? WHERE id = ?')
const selectPicture = db.prepare('SELECT data, content_type FROM user_pictures WHERE user_id = ?')
const upsertPicture = db.prepare(`INSERT INTO user_pictures (user_id, data, content_type, updated_at) VALUES (?, ?, ?, ?)
	ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, content_type = excluded.content_type, updated_at = excluded.updated_at`)
const deletePicture = db.prepare('DELETE FROM user_pictures WHERE user_id = ?')
const selectHash = db.prepare('SELECT password_hash FROM users WHERE id = ?')
const setPassword = db.prepare('UPDATE users SET password_hash = ?, password_changed_at = unixepoch() WHERE id = ?')
const finishSetup = db.prepare('UPDATE users SET needs_setup = 0 WHERE id = ?')

router.patch('/', (req, res) => {
	const name = cleanName(req.body?.name)
	if (name.length > MAX_NAME) return res.status(400).json({ error: `A name is ${MAX_NAME} characters at most.` })
	setName.run(name || null, req.user.id)
	res.json({ name: name || null })
})

router.get('/picture', (req, res) => {
	const picture = selectPicture.get(req.user.id)
	if (!picture) return res.status(404).json({ error: 'There is no picture.' })
	res.set({ 'Content-Type': picture.content_type, 'Cache-Control': 'private, max-age=31536000, immutable' })
	res.send(picture.data)
})

router.put('/picture', upload.single('file'), async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'No picture was sent.' })
	if (detectFileType(req.file.buffer)?.kind !== 'image')
		return res.status(400).json({ error: 'That file is not a picture. Choose a JPG or PNG.' })
	let meta
	try { meta = await sharp(req.file.buffer).rotate().metadata() } catch {
		return res.status(400).json({ error: 'That picture could not be read. Choose a JPG or PNG.' })
	}
	if (Math.min(meta.width ?? 0, meta.height ?? 0) < MIN_PICTURE)
		return res.status(400).json({ error: `That picture is too small. It must be at least ${MIN_PICTURE} by ${MIN_PICTURE}.` })
	const data = await sharp(req.file.buffer).rotate()
		.resize(PICTURE_SIZE, PICTURE_SIZE, { fit: 'cover', position: sharp.strategy.attention })
		.webp({ quality: 85 }).toBuffer()
	const at = nowEpoch()
	upsertPicture.run(req.user.id, data, 'image/webp', at)
	res.status(201).json({ picture: `/api/account/picture?v=${at}` })
})

router.delete('/picture', (req, res) => {
	deletePicture.run(req.user.id)
	res.json({ picture: null })
})

/** Change password from Settings: the current one is asked for; other sessions stay signed in. */
router.post('/password', async (req, res) => {
	const current = String(req.body?.current ?? '')
	const password = String(req.body?.password ?? '')
	const { password_hash: hash } = selectHash.get(req.user.id)
	if (!(await verifyPassword(current, hash)))
		return res.status(400).json({ error: 'That is not your current password.', fields: { current: 'That is not your current password.' } })
	if (password.length < MIN_PASSWORD)
		return res.status(400).json({ error: `Use at least ${MIN_PASSWORD} characters.`, fields: { password: `Use at least ${MIN_PASSWORD} characters.` } })
	setPassword.run(await hashPassword(password), req.user.id)
	res.json({ passwordChangedAt: nowEpoch() })
})

router.post('/setup-done', (req, res) => {
	finishSetup.run(req.user.id)
	res.status(204).end()
})
