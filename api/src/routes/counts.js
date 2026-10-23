import { Router } from 'express'
import { db } from '../db.js'
import { draftCount } from '../lib/orderDrafts.js'

export const router = Router()

/* How many of each record the account has, as the menu counts them: every order with the drafts,
   the vendors and bookmarks not archived, every category. One request, and nothing but counts. */
const countOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ?')
const countVendors = db.prepare('SELECT COUNT(*) c FROM vendors WHERE user_id = ? AND archived = 0')
const countCategories = db.prepare('SELECT COUNT(*) c FROM categories WHERE user_id = ?')
const countBookmarks = db.prepare('SELECT COUNT(*) c FROM bookmarks WHERE user_id = ? AND archived = 0')

router.get('/', (req, res) => {
	const userId = req.user.id
	res.json({
		orders: countOrders.get(userId).c + draftCount(userId),
		vendors: countVendors.get(userId).c,
		categories: countCategories.get(userId).c,
		bookmarks: countBookmarks.get(userId).c
	})
})
