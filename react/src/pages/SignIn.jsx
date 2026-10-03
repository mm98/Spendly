import { useEffect, useState } from 'react'
import { Link, useMatches, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { failureMessage, getAuthOptions, getCurrentUser, login } from '../api/client.js'

// the server refuses anything shorter
export const MIN_PASSWORD = 12

const STRENGTH = ['Weak', 'Fair', 'Strong', 'Very strong']

/** 1 to 4 from length first ("longer beats complicated"); a password of few different characters is weak. */
export function strengthOf(password) {
	const n = password.length
	if (n < MIN_PASSWORD || new Set(password).size < 5) return 1
	return n < 12 ? 2 : n < 16 ? 3 : 4
}

/** The new-password field's meter (20a, 20c): four segments and a word, then the field's hint. */
export function PasswordHint({ password, hint }) {
	if (!password) return hint
	const level = strengthOf(password)
	const weak = level < 3
	return (
		<span className="sp-stack sp-gap-6">
			<span className="sp-row-flex sp-gap-8">
				<span className="sp-gauge sp-gauge--thin sp-grow" aria-hidden="true">
					<span className="au-strength">
						{[1, 2, 3, 4].map(i => (
							<span key={i} className={'sp-grow au-fill' + (i > level ? ' au-fill--off' : weak ? ' au-fill--weak' : '')} />
						))}
					</span>
				</span>
				<span className={'sp-meta sp-strong sp-nowrap ' + (weak ? 'sp-ink-warning' : 'sp-ink-accent')}>{password.length < MIN_PASSWORD ? 'Too short' : STRENGTH[level - 1]}</span>
			</span>
			{hint ? <span>{hint}</span> : null}
		</span>
	)
}

// the server's own rule, so an address it would refuse is named before it is sent
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_PROBLEM = 'Enter a valid email address.'
// after the render that binds the field's message, so it is read out with the field
export const focusField = id => requestAnimationFrame(() => document.getElementById(id)?.focus())

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
    a line, an alert slot, the fields, the primary action and what sits under it. A warning alert carries a title. */
export function AuthCard({
	title, lead, mark = true, icon, alert, alertColor = 'danger', alertIcon = 'alert-circle', alertTitle, onSubmit, submit,
	submitIcon, submitVariant = 'solid', busy, busyLabel, disabled = false, gap = 14, across, note, terms, footer, children
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
							<span className="sp-row-flex sp-flex-none"><Icon name={alertIcon} /></span>
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

/** Whether this server can send a link by email, which decides if a reset is offered at all. */
export function useMail() {
	return Boolean(useAuthOptions()?.mail)
}

/** The server's answer for the signed-out pages, or null until it comes. */
export function useAuthOptions() {
	const [options, setOptions] = useState(null)
	useEffect(() => { getAuthOptions().then(setOptions).catch(() => {}) }, [])
	return options
}

export default function SignIn() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [remember, setRemember] = useState(true)
	const [emailProblem, setEmailProblem] = useState(null)
	const [passwordProblem, setPasswordProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const [lockedFor, setLockedFor] = useCountdown()
	const mail = useMail()
	const signedOut = useSignedOut()
	const locked = lockedFor > 0
	const resetTo = `/reset${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ''}`

	const checkEmail = () => {
		const ok = !email.trim() || EMAIL_PATTERN.test(email.trim())
		setEmailProblem(ok ? null : EMAIL_PROBLEM)
		return ok
	}

	// an empty field is named on its own, as Register does; only a sent pair is answered vaguely (20a)
	const submit = () => {
		if (locked) return mail ? navigate(resetTo) : null
		const emailOk = checkEmail() && EMAIL_PATTERN.test(email.trim())
		if (!emailOk) setEmailProblem(EMAIL_PROBLEM)
		const passwordOk = password !== ''
		setPasswordProblem(passwordOk ? null : 'Enter your password.')
		if (!emailOk || !passwordOk) return focusField(emailOk ? 'signin-password' : 'signin-email')
		setBusy(true)
		setAlert(null)
		login(email.trim().toLowerCase(), password, remember)
			.then(user => navigate(onward(user, landing(params)), { replace: true }))
			.catch(e => {
				setBusy(false)
				if (e?.status === 429 && e.body?.retryAfter) {
					setLockedFor(e.body.retryAfter)
					return
				}
				setAlert(e?.status === 401
					? "That email and password don't match. Check both and try again."
					: failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
				document.getElementById('signin-password')?.focus()
			})
	}

	const forgot = mail && !locked ? <Button variant="outline" size="small" to={resetTo}>Forgot it?</Button> : null

	if (!signedOut) return null
	if (locked) return (
		<AuthCard title="Sign in to Spendly" alertColor="warning" alertIcon="lock" alertTitle="Too many attempts"
			alert={<>Sign in is paused for <b>{waitWords(lockedFor)}</b>.{mail ? ' You can reset your password instead - that works straight away.' : ''}</>}
			onSubmit={submit} submit={mail ? 'Reset my password' : 'Sign in'} disabled={!mail} gap={12}
			note={mail ? `Or wait ${waitWords(lockedFor)} and try again.` : `Wait ${waitWords(lockedFor)} and try again.`}>
			<Field label="Email" id="signin-email">
				<TextField type="email" autoComplete="email" value={email} disabled onChange={() => {}} />
			</Field>
			<Field label="Password" id="signin-password">
				<PasswordField autoComplete="current-password" value={password} disabled onChange={() => {}} />
			</Field>
		</AuthCard>
	)
	return (
		<AuthCard title="Sign in to Spendly" lead={alert ? null : 'Your orders, receipts and monthly limits.'} alert={alert}
			onSubmit={submit} submit="Sign in" busy={busy} busyLabel="Signing in…"
			across={alert ? null : <>New here? <Link className="sp-strong sp-ink-accent au-across" to="/register">Create an account</Link></>}>
			<Field label="Email" id="signin-email" message={emailProblem ?? undefined} messageType={emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			<Field label="Password" id="signin-password" labelAction={forgot}
				message={passwordProblem ?? undefined} messageType={passwordProblem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="current-password" value={password}
					onChange={v => { setPassword(v); setPasswordProblem(null) }} />
			</Field>
			{alert ? null : (
				<Choice control={<Check checked={remember} onChange={ev => setRemember(ev.target.checked)} />}>
					Stay signed in for 30 days
				</Choice>
			)}
		</AuthCard>
	)
}
