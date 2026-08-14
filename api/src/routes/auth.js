import { Router } from 'express'
import { db } from '../db.js'
import { newId } from '../lib/ids.js'
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth } from '../lib/auth.js'
import { seedAccountDefaults } from '../seed.js'

export const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const findUserByEmail = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
const insertUser = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')

router.post('/register', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
	if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
	if (findUserByEmail.get(email)) return res.status(409).json({ error: 'An account with that email already exists.' })

	const id = newId('u')
	const passwordHash = await hashPassword(password)
	db.transaction(() => {
		insertUser.run(id, email, passwordHash)
		seedAccountDefaults(db, id)
	})()

	createSession(res, id)
	res.status(201).json({ id, email })
})

router.post('/login', async (req, res) => {
	const email = String(req.body?.email ?? '').trim().toLowerCase()
	const password = String(req.body?.password ?? '')
	const user = findUserByEmail.get(email)
	if (!user || !(await verifyPassword(password, user.password_hash)))
		return res.status(401).json({ error: 'Wrong email or password.' })

	createSession(res, user.id)
	res.json({ id: user.id, email: user.email })
})

router.post('/logout', (req, res) => {
	destroySession(req, res)
	res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
	res.json({ id: req.user.id, email: req.user.email })
})
