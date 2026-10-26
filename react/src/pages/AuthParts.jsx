import { useEffect, useState } from 'react'
import { useMatches, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { Gauge } from '../components/Data.jsx'
import { useShellShape } from '../app/useMedia.js'
import { getAuthOptions, getCurrentUser } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { useAfterDraw } from '../app/afterDraw.js'

// the server refuses anything shorter
export const MIN_PASSWORD = 12

const STRENGTH = ['Weak', 'Fair', 'Strong', 'Very strong']

/** 1 to 4 from length first ("longer beats complicated"); a password of few different characters is weak. */
export function strengthOf(password) {
	const n = password.length
	if (n < MIN_PASSWORD || new Set(password).size < 5) return 1
	return n < 12 ? 2 : n < 16 ? 3 : 4
}

/** The new-password field's meter (20a, 20c): a thin gauge at a quarter per step, a word, then the field's hint. */
export function PasswordHint({ password, hint }) {
	if (!password) return hint
	const level = strengthOf(password)
	const weak = level < 3
	return (
		<span className="sp-stack sp-gap-6">
			<span className="sp-row-flex sp-gap-8">
				<span className="sp-grow"><Gauge thin value={level * 25} aria-hidden="true" /></span>
				<span className={'sp-meta sp-strong sp-nowrap ' + (weak ? 'sp-ink-warning' : 'sp-ink-accent')}>{password.length < MIN_PASSWORD ? 'Too short' : STRENGTH[level - 1]}</span>
			</span>
			{hint ? <span>{hint}</span> : null}
		</span>
	)
}

// the server's own rule, so an address it would refuse is named before it is sent
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_PROBLEM = 'Enter a valid email address.'
/** Focus for a field, once the page has drawn the message bound to it, so it is read out with the
    field, once the request that failed has unlocked it. */
export function useFocusField() {
	const afterDraw = useAfterDraw()
	return id => afterDraw(() => document.getElementById(id)?.focus())
}

/** "4 minutes", "1 minute", or seconds under a minute: a wait as the reader counts it. */
export const waitWords = seconds => (seconds >= 60
	? `${Math.ceil(seconds / 60)} ${Math.ceil(seconds / 60) === 1 ? 'minute' : 'minutes'}`
	: `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`)

/** A countdown in whole seconds from `seconds`, restarted whenever `seconds` is set again. */
export function useCountdown() {
	const [left, setLeft] = useState(0)
	useEffect(() => {
		if (left <= 0) return
		const tick = setTimeout(() => setLeft(n => n - 1), 1000)
		return () => clearTimeout(tick)
	}, [left])
	return [left, setLeft]
}

// each glyph at the size its drawing gives it
const STATUS_ICON = { mail: 21, check: 24, clock: 20 }
// the space over what sits under the primary button, which each drawing sets
const UNDER = { 10: 'sp-gap-10', 12: 'sp-gap-12', 14: 'sp-gap-14' }

/** Every screen outside the shell is one card (20a-20d): the brand or a round status mark, a heading and
    a line, an alert slot, the fields, the primary action and what sits under it. A warning alert carries a title.
    `secondary` is a second full-width button under the primary one. */
export function AuthCard({
	title, lead, mark = true, icon, alert, alertColor = 'danger', alertIcon = 'alert-circle', alertTitle, onSubmit, submit,
	submitIcon, submitVariant = 'solid', busy, busyLabel, disabled = false, gap = 14, secondary, across, note, terms, footer, children
}) {
	const shape = useShellShape()
	// outside the shell, so the tab is named here, from the route's own title
	const named = useMatches().at(-1)?.handle?.title
	useEffect(() => { if (named) document.title = `${named} - Spendly` }, [named])
	const warning = alertColor === 'warning'
	const card = (
		<Card variant="float" footer={footer}>
			<div className="sp-stack sp-gap-12 sp-center au-centred">
				{icon
					? <Mark size="large" round aria-hidden="true" aria-label={icon}><Icon name={icon} size={STATUS_ICON[icon]} /></Mark>
					: mark ? <Mark size="large" fill="solid" aria-label="Spendly"><span>S</span></Mark> : null}
				<div className="sp-stack sp-gap-6">
					<span className="sp-heading">{title}</span>
					{lead ? <span className="sp-data">{lead}</span> : null}
				</div>
			</div>
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !disabled) onSubmit() }}>
				{alert
					? (
						<ListItem variant="top" color={alertColor} role="alert">
							<Icon name={alertIcon} />
							{warning
								? (
									<span className="sp-stack sp-gap-6">
										<span className="sp-title sp-ink-warning">{alertTitle}</span>
										<span className="sp-meta sp-ink-warning">{alert}</span>
									</span>
								)
								: <span className="sp-data sp-ink-danger">{alert}</span>}
						</ListItem>
					)
					: null}
				{children}
				<div className={'sp-stack ' + UNDER[gap]}>
					<Button type="submit" size="small" variant={submitVariant} fullWidth disabled={busy || disabled}>
						{busy ? <><Spinner />{busyLabel}</> : <>{submitIcon ? <Icon name={submitIcon} size={14} /> : null}{submit}</>}
					</Button>
					{secondary}
					{terms ? <span className="sp-meta sp-center">{terms}</span> : null}
					{across ? <span className="sp-data sp-center">{across}</span> : null}
					{note ? <span className="sp-meta sp-center">{note}</span> : null}
				</div>
			</form>
		</Card>
	)
	return <main className={shape === 'touch' ? 'sp-auth sp-touch' : 'sp-auth'}>{card}</main>
}

/** Where to go once signed in: the page that sent the reader here, or Home. Never back to
    these pages, which would only send a signed-in reader on again. */
export const landing = params => {
	const next = params.get('next')
	return next && next.startsWith('/') && !next.startsWith('//') && !/^\/(signin|register|reset|confirm|welcome)(?![\w-])/.test(next) ? next : '/'
}

/** Where a signed-in reader goes: the first run while it is unfinished (20e), else `next`. */
export const onward = (user, next) => (user?.needsSetup ? `/welcome?next=${encodeURIComponent(next)}` : next)

/** A reader who is already signed in goes on to where signing in would take them (20e). False
    until the server has answered, so the form never shows to someone it would not apply to. */
export function useSignedOut() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [signedOut, setSignedOut] = useState(false)
	useEffect(() => {
		const ask = new AbortController()
		// asked fresh: a remembered answer can outlive the session it describes
		getCurrentUser(ask.signal)
			.then(user => navigate(onward(user, landing(params)), { replace: true }))
			.catch(e => { if (e?.name !== 'AbortError') setSignedOut(true) })
		return () => ask.abort()
	}, [])
	return signedOut
}

/** Whether this server can send a link by email, which decides if a reset is offered at all; null until it answers. */
export function useMail() {
	const options = useAuthOptions()
	return options ? Boolean(options.mail) : null
}

/** The server's answer for the signed-out pages, or null until it comes. */
export function useAuthOptions() {
	return useApi(getAuthOptions).data ?? null
}
