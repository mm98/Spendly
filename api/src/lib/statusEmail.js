import { db } from '../db.js'
import { CURRENCIES } from './constants.js'
import { fromEpoch, toEpoch } from './dates.js'
import { emailMessage, emailPhrase } from './emails.js'
import { emailLanguageOf } from './phrases.js'
import { inBackground, mailAvailable, publicLink, sendMail } from './mail.js'
import { readYear } from './budget.js'
import { draftCount } from './orderDrafts.js'
import { keyOfType } from './statuses.js'
import { attentionCounts, limitsPassed, periodSummary } from './stats.js'
import { forgetReads } from './readCache.js'
import { issueToken, readToken, useToken } from './tokens.js'
import { log } from './log.js'

/* The status email (20f, emails/README.md): Weekly on Monday at 08:00 for the week just ended,
   Monthly on the 1st at 08:00 for the month just ended, in the account's own time zone. Either,
   both or neither is on (11a); on a 1st that is a Monday only the monthly one is sent. */

export const STATUS_EMAILS = ['weekly', 'monthly']
const SEND_HOUR = 8
const DAY = 86400
const LIST_ROWS = 5

/* ---- the account's own calendar ---- */

const zoneOrServer = zone => {
	try { if (zone) return new Intl.DateTimeFormat('en-GB', { timeZone: zone }).resolvedOptions().timeZone } catch { /* an unknown zone falls back */ }
	return new Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** The day, hour and weekday (Monday = 0) it is in `zone` at `now`. */
function localNow(zone, now = new Date()) {
	const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
		timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
	}).formatToParts(now).map(p => [p.type, p.value]))
	const day = `${parts.year}-${parts.month}-${parts.day}`
	return { day, hour: Number(parts.hour), weekday: (new Date(toEpoch(day) * 1000).getUTCDay() + 6) % 7 }
}

/** The moment `day` starts in `zone`, as epoch seconds: what a bookmark's moment of saving is held against. */
function startOfDayIn(day, zone) {
	const midnight = toEpoch(day)
	const offsetAt = at => {
		const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
			timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
		}).formatToParts(new Date(at * 1000)).map(x => [x.type, Number(x.value)]))
		return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) / 1000 - at
	}
	const guess = midnight - offsetAt(midnight)
	return midnight - offsetAt(guess)
}

const addDays = (day, n) => fromEpoch(toEpoch(day) + n * DAY)
const firstOfMonth = (day, shift = 0) => {
	const [y, m] = day.split('-').map(Number)
	return fromEpoch(Date.UTC(y, m - 1 + shift, 1) / 1000)
}

/** The latest period whose email is due by now, the day it fell due, and its id ('2026-W42', '2026-09'). */
export function latestDuePeriod(frequency, { day, hour, weekday }) {
	let due
	if (frequency === 'weekly') {
		due = addDays(day, -weekday)
		if (weekday === 0 && hour < SEND_HOUR) due = addDays(due, -7)
	} else {
		due = firstOfMonth(day)
		if (day === due && hour < SEND_HOUR) due = firstOfMonth(due, -1)
	}
	const from = frequency === 'weekly' ? addDays(due, -7) : firstOfMonth(due, -1)
	return { frequency, from, to: due, due, id: frequency === 'weekly' ? weekIdOf(from) : from.slice(0, 7) }
}

function weekIdOf(monday) {
	const thursday = new Date((toEpoch(monday) + 3 * DAY) * 1000)
	const year = thursday.getUTCFullYear()
	const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY * 1000)) + 1
	return `${year}-W${String(week).padStart(2, '0')}`
}
const weekNumberOf = monday => Number(weekIdOf(monday).slice(6))

/* ---- the account's own way of writing numbers and dates ---- */

/** How the account writes amounts, counts and dates in an email, in `locale`. */
export function writerFor({ locale, currency }) {
	const symbol = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0]
	const numbers = new Map()
	const figure = (n, decimals) => {
		if (!numbers.has(decimals)) numbers.set(decimals, new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
		const text = numbers.get(decimals).format(Math.abs(n))
		return (n < 0 && /[1-9]/.test(text) ? '-' : '') + text
	}
	const money = (n, decimals = 2) => {
		const text = figure(n, decimals)
		if (!symbol.before) return `${text} ${symbol.symbol}`
		return text.startsWith('-') ? `-${symbol.symbol}${text.slice(1)}` : symbol.symbol + text
	}
	const english = locale.startsWith('en')
	// an English short month is cut to three letters ("Sept" -> "Sep"), as the app writes it
	const shortMonths = parts => parts.map(p => (p.type === 'month' && english ? p.value.slice(0, 3) : p.value))
	const dateOf = day => new Date(toEpoch(day) * 1000)
	const format = options => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })
	const range = (options, from, last, between) => format(options).formatRangeToParts(dateOf(from), dateOf(last))
		.map(p => (p.type === 'literal' && p.source === 'shared' ? { ...p, value: p.value.replace(/\s*–\s*/, between) } : p))
	return {
		money,
		count: n => figure(n, 0),
		// "1,5": a size, with no more decimals than it has, at most two
		quantity: n => figure(n, Number.isInteger(n) ? 0 : Number.isInteger(n * 10) ? 1 : 2),
		// "30 Sep", with the year once it is not the year the email is about
		dayMonth: (day, year) => shortMonths(format({ day: 'numeric', month: 'short', ...(day.startsWith(year) ? {} : { year: 'numeric' }) })
			.formatToParts(dateOf(day))).join(''),
		// "21 Oct 2026"
		date: day => shortMonths(format({ day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(dateOf(day))).join(''),
		// "12 - 18 Oct 2026"
		days: (from, last) => shortMonths(range({ day: 'numeric', month: 'short', year: 'numeric' }, from, last, ' - ')).join(''),
		// ["19", "25 October"]: the two ends of a range, written as one, for a sentence to join
		between: (from, last) => range({ day: 'numeric', month: 'long' }, from, last, '\u0000').map(p => p.value).join('').split('\u0000')
	}
}

/* ---- what the email says ---- */

const selectAccount = db.prepare(`SELECT u.email, s.locale, s.currency, s.colour_scheme, s.status_email_weekly, s.status_email_monthly, s.status_email_zone, s.status_email_locale
	FROM users u JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?`)
const selectBookmarksAdded = db.prepare(`SELECT name, url, price FROM bookmarks
	WHERE user_id = @userId AND archived = 0 AND created_at >= @from AND created_at < @to
	ORDER BY created_at DESC, rowid DESC LIMIT @limit`)
const countDraftOrders = db.prepare('SELECT COUNT(*) c FROM orders WHERE user_id = ? AND status = ?')

/** The first of `asked` this server can write numbers in, else en-GB; 'auto' is never usable. */
export const usableLocale = (...asked) => asked.find(l => {
	try { return l && l !== 'auto' && Intl.NumberFormat.supportedLocalesOf(l).length > 0 } catch { return false }
}) ?? 'en-GB'

/** The shop's name for a bookmark, as the Bookmarks page writes it under the name. */
const siteOf = url => {
	try { return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '') } catch { return String(url ?? '') }
}

// a month's name in the email's language, as a sentence writes it
const monthIn = (language, day) => new Intl.DateTimeFormat(language, { timeZone: 'UTC', month: 'long' }).format(new Date(toEpoch(day) * 1000))
const firstFlagged = rows => rows.map((row, i) => ({ ...row, first: i === 0 }))

function budgetOf(userId, period, write, language) {
	const costsIn = day => {
		const sheet = readYear(userId, Number(day.slice(0, 4)))
		if (!sheet) return null
		const month = Number(day.slice(5, 7)) - 1
		const lines = sheet.groups.filter(g => g.kind === 'expense').flatMap(g => g.lines).map(l => l.months[month])
			.filter(m => m.expected != null || m.real != null)
		return {
			real: lines.reduce((s, m) => s + (m.real ?? m.expected), 0),
			expected: lines.reduce((s, m) => s + (m.expected ?? m.real), 0),
			rows: lines.length
		}
	}
	const last = costsIn(period.from)
	if (!last?.rows) return { budget: false }
	const next = costsIn(period.to) ?? { expected: 0, rows: 0 }
	const difference = Math.round((last.real - last.expected) * 100) / 100
	return {
		budget: true,
		last_real: write.money(last.real),
		last_expected: write.money(last.expected),
		difference_way: !difference ? 'same' : difference < 0 ? 'under' : 'over',
		difference_amount: write.money(Math.abs(difference)),
		under: difference <= 0,
		last_pct: last.expected > 0 ? Math.min(100, Math.round(last.real / last.expected * 100)) : 100,
		next_month: monthIn(language, period.to),
		next_expected: write.money(next.expected),
		next_rows_count: next.rows,
		next_rows_shown: write.count(next.rows)
	}
}

function needsOf(userId, day, write, link) {
	const rows = []
	const row = (kind, count, url) => rows.push({ kind, need_count: count, need_shown: write.count(count), url })
	const draftKey = keyOfType(userId, 'draft')
	const drafts = draftCount(userId) + (draftKey ? countDraftOrders.get(userId, draftKey).c : 0)
	if (drafts) row('drafts', drafts, link(`/orders?status=${encodeURIComponent(draftKey ?? 'Draft')}`))
	const things = attentionCounts(userId, day)
	if (things.late?.count) row('late', things.late.count, link(`/orders?status=${encodeURIComponent(things.late.status)}&to=${things.late.to}`))
	if (things.vendors?.count) row('vendors', things.vendors.count, link('/vendors?flag=possible-duplicate'))
	if (things.receipt?.count) row('receipt', things.receipt.count, link('/orders?receipt=missing'))
	return rows
}

/** The template, its values and its language for one account's email about `period`, with `stopUrl` as its
    Stop these emails link. `locale` is the asking browser's, which a test is written in before any choice stores one. */
export function statusEmailFor(userId, period, stopUrl, { locale } = {}) {
	const account = selectAccount.get(userId)
	const write = writerFor({ locale: usableLocale(account.locale, account.status_email_locale, locale), currency: account.currency })
	const link = publicLink
	const weekly = period.frequency === 'weekly'
	const zone = zoneOrServer(account.status_email_zone)
	const from = toEpoch(period.from)
	const to = toEpoch(period.to)
	const last = addDays(period.to, -1)
	const week = weekly ? weekNumberOf(period.from) : null
	const language = emailLanguageOf(userId)
	const month = monthIn(language, period.from)
	const now = periodSummary(userId, from, to, LIST_ROWS)

	// a week measures a monthly limit on its calendar month so far, and a yearly one on its year so far
	const monthFrom = weekly ? toEpoch(firstOfMonth(last)) : from
	const limits = limitsPassed(userId, monthFrom, to)

	const common = {
		period_kind: weekly ? 'week' : 'month',
		week: String(week ?? ''),
		days: write.days(period.from, last),
		period_month: month.charAt(0).toLocaleUpperCase(language) + month.slice(1),
		period_month_in: month,
		year: period.from.slice(0, 4),
		scope_month: monthIn(language, last),
		app_url: link('/'), settings_url: link('/settings/account'), unsubscribe_url: stopUrl,
		categories_url: link('/categories'), orders_url: link(`/orders?from=${period.from}&to=${last}`),
		bookmarks_url: link('/bookmarks'), budget_url: link('/budget'),
		limits_any: limits.length > 0,
		limits_count: limits.length,
		limits_shown: write.count(limits.length),
		limits: firstFlagged(limits.map(c => ({
			name: c.name, spent: write.money(c.spend), limit: write.money(c.budget), limit_period: c.budgetPeriod, limit_year: last.slice(0, 4),
			limit_year_ended: last.endsWith('-12-31') ? 'yes' : 'no',
			over_pct: String(Math.round((c.spend / c.budget - 1) * 100)), fill_pct: Math.round(c.budget / c.spend * 100)
		}))),
		...(weekly ? { budget: false } : budgetOf(userId, period, write, language)),
		needs: firstFlagged(needsOf(userId, period.to, write, link))
	}
	common.needs_any = common.needs.length > 0

	if (!now.orders) {
		const [betweenFrom, betweenTo] = write.between(period.from, last)
		return { template: 'status-quiet', language, values: { ...common, between_from: betweenFrom, between_to: betweenTo } }
	}

	const before = weekly ? { from: from - 7 * DAY, to: from } : { from: toEpoch(firstOfMonth(period.from, -1)), to: from }
	const earlier = periodSummary(userId, before.from, before.to, 0)
	const difference = Math.round(now.spent) - Math.round(earlier.spent)

	const top = now.split.slice(0, LIST_ROWS)
	const year = period.from.slice(0, 4)
	const bookmarks = selectBookmarksAdded.all({ userId, from: startOfDayIn(period.from, zone), to: startOfDayIn(period.to, zone), limit: LIST_ROWS })
	const saving = n => Math.round(Math.max(0, n) * 100) / 100

	return {
		template: 'status',
		language,
		values: {
			...common,
			spent: write.money(now.spent, 0),
			saved_amount: write.money(saving(now.saved)),
			compare: !earlier.orders ? 'none' : !difference ? 'same' : difference < 0 ? 'less' : 'more',
			compare_amount: write.money(Math.abs(difference), 0),
			before_week: weekly ? String(weekNumberOf(fromEpoch(before.from))) : '',
			before_month: monthIn(language, fromEpoch(before.from)),
			saved_fig: write.money(saving(now.saved), 0),
			has_saving: Math.round(now.saved) > 0,
			saving_count: write.count(now.saving),
			orders_count: now.orders,
			orders_shown: write.count(now.orders),
			count: write.count(now.orders),
			delivered: write.count(now.delivered),
			categories_any: top.length > 0,
			categories: firstFlagged(top.map(c => ({ name: c.name, amount: write.money(c.amount), pct: Math.round(c.amount / top[0].amount * 100) }))),
			orders_any: now.latest.length > 0,
			orders: firstFlagged(now.latest.map(o => ({
				vendor: o.vendor, category: o.category ?? '', has_category: o.category != null, date: write.dayMonth(fromEpoch(o.date), year),
				amount: write.money(o.total), saving: write.money(saving(o.saved)), has_saving: saving(o.saved) > 0
			}))),
			bookmarks_any: bookmarks.length > 0,
			bookmarks: firstFlagged(bookmarks.map(b => ({ name: b.name, vendor: siteOf(b.url), price: b.price != null ? write.money(b.price) : '' })))
		}
	}
}

/* ---- sending ---- */

const markSent = {
	weekly: db.prepare('UPDATE user_settings SET status_email_weekly_sent = ? WHERE user_id = ?'),
	monthly: db.prepare('UPDATE user_settings SET status_email_monthly_sent = ? WHERE user_id = ?')
}
const selectChosen = db.prepare(`SELECT user_id, status_email_weekly, status_email_monthly, status_email_zone, status_email_weekly_sent, status_email_monthly_sent
	FROM user_settings WHERE status_email_weekly = 1 OR status_email_monthly = 1`)
const setChoice = db.prepare(`UPDATE user_settings SET status_email_weekly = @weekly, status_email_monthly = @monthly,
	status_email_zone = @zone, status_email_locale = @locale, status_email_weekly_sent = @weeklySent, status_email_monthly_sent = @monthlySent
	WHERE user_id = @userId`)
const stopFor = db.prepare('UPDATE user_settings SET status_email_weekly = 0, status_email_monthly = 0 WHERE user_id = ?')

const STOP_KIND = 'status-stop'

/** Sends one account its email about `period`; a test's subject starts "Test:". */
export async function sendStatusEmail(userId, period, { test = false, locale } = {}) {
	const { email, colour_scheme: scheme } = selectAccount.get(userId)
	const token = issueToken(userId, STOP_KIND, email)
	const { template, values, language } = statusEmailFor(userId, period, publicLink(`/email/stop/${token}`), { locale })
	const message = emailMessage(template, email, values, { scheme, language })
	await sendMail({
		...message,
		subject: test ? emailPhrase(language, 'email.test', { subject: message.subject }) : message.subject,
		headers: { 'List-Unsubscribe': `<${publicLink(`/auth/status-email/stop/${token}`, { api: true })}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
	})
}

/** Stores which of Weekly and Monthly are on. The period already due when one is turned on counts as
    sent, so its first email is the next one, never one about a period that ended before the choice. */
export function chooseStatusEmail(userId, { weekly, monthly, zone, locale }) {
	const kept = zoneOrServer(zone)
	const local = localNow(kept)
	setChoice.run({
		userId, weekly: weekly ? 1 : 0, monthly: monthly ? 1 : 0, zone: kept, locale: usableLocale(locale) === locale ? locale : null,
		weeklySent: weekly ? latestDuePeriod('weekly', local).id : null,
		monthlySent: monthly ? latestDuePeriod('monthly', local).id : null
	})
}

/** Send a test email (11a): the email for the period just ended, now; the monthly one only when Monthly
    alone is on. `zone` and `locale` are the asking browser's, used until a choice stores them. */
export async function sendTestStatusEmail(userId, { zone, locale }) {
	const account = selectAccount.get(userId)
	const frequency = account.status_email_monthly && !account.status_email_weekly ? 'monthly' : 'weekly'
	const period = latestDuePeriod(frequency, localNow(zoneOrServer(account.status_email_zone ?? zone)))
	await sendStatusEmail(userId, period, { test: true, locale })
	return account.email
}

/** A stop link from a status email (20f, 8 to 10): `state` is 'stopped', 'used' when the link was opened
    before or both are already off, or 'expired'; `email` is the address, while the link still works. */
export function stopStatusEmail(token) {
	const { state, row } = readToken(token, STOP_KIND)
	if (state === 'expired') return { state }
	if (state === 'used') return { state, email: row.email }
	useToken(token)
	const account = selectAccount.get(row.user_id)
	if (!account.status_email_weekly && !account.status_email_monthly) return { state: 'used', email: row.email }
	stopFor.run(row.user_id)
	// signed out, so no write of the account's own clears what it last read
	forgetReads(row.user_id)
	return { state: 'stopped', email: row.email }
}

/** Sends every email that has fallen due. Due means 08:00 on the day or later, until 08:00 the
    day after, so a server that was off at 08:00 still sends when it starts again that day. */
export function sendDueStatusEmails(now = new Date()) {
	for (const row of selectChosen.all()) {
		const local = localNow(zoneOrServer(row.status_email_zone), now)
		const monthly = row.status_email_monthly ? latestDuePeriod('monthly', local) : null
		for (const frequency of STATUS_EMAILS) {
			if (!row[`status_email_${frequency}`]) continue
			const period = frequency === 'monthly' ? monthly : latestDuePeriod(frequency, local)
			const inTime = local.day === period.due || (local.day === addDays(period.due, 1) && local.hour < SEND_HOUR)
			if (!inTime || row[`status_email_${frequency}_sent`] === period.id) continue
			// marked first: a send that keeps failing is tried once, not every minute
			markSent[frequency].run(period.id, row.user_id)
			// on a 1st that is a Monday the monthly email comes instead of the weekly one
			if (frequency === 'weekly' && monthly?.due === period.due) continue
			inBackground(sendStatusEmail(row.user_id, period))
		}
	}
}

/** Looks once a minute for emails that have fallen due. */
export function scheduleStatusEmails() {
	if (!mailAvailable()) return
	const tick = () => {
		try { sendDueStatusEmails() } catch (e) { log.error('mail', `Status emails: ${e.message}`) }
	}
	tick()
	setInterval(tick, 60 * 1000).unref()
}
