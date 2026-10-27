import { useEffect, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { Icon } from '../components/Icon.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle } from '../components/Overlays.jsx'
import { cancelTwoStepSignIn, failureMessage, finishTwoStepSignIn, login } from '../api/client.js'
import { ActionLink, CODE_KINDS, cleanCode, useCountdown, waitWords } from '../pages/AuthParts.jsx'

/** A session that ended mid-use (20e, level 3): the reader signs in again over the page, which
    stays mounted with whatever was typed. With no address in hand, Sign in goes to the sign-in page. */
export function SessionDialog({ email, onSignedIn, onLater, onSignInPage }) {
	const [asking, setAsking] = useState(false)
	const [password, setPassword] = useState('')
	const [problem, setProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const [lockedFor, setLockedFor] = useCountdown()
	// the code step (20g): the same step as the sign-in page, in this dialog, without the lost-phone line
	const [ticket, setTicket] = useState(null)
	const [kind, setKind] = useState('app')
	const [code, setCode] = useState('')
	const [timedOut, setTimedOut] = useState(false)
	useEffect(() => { if (asking) document.getElementById(ticket ? 'session-code' : 'session-password')?.focus() }, [asking, ticket, kind])

	const submit = () => {
		if (!password) {
			setProblem('Enter your password.')
			return document.getElementById('session-password')?.focus()
		}
		setBusy(true)
		setAlert(null)
		login(email, password, true)
			.then(user => {
				setPassword('')
				if (!user.twoStep) return onSignedIn()
				setBusy(false)
				setKind('app')
				setCode('')
				setTicket(user.ticket)
			})
			.catch(e => {
				setBusy(false)
				if (e?.status === 429 && e.body?.retryAfter) return setLockedFor(e.body.retryAfter)
				setAlert(e?.status === 401
					? "That email and password don't match. Check both and try again."
					: failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
				document.getElementById('session-password')?.focus()
			})
	}
	const locked = lockedFor > 0

	const leaveCodeStep = () => {
		if (ticket && !timedOut) cancelTwoStepSignIn(ticket).catch(() => {})
		setTicket(null)
		setTimedOut(false)
		setLockedFor(0)
		setAlert(null)
		setProblem(null)
	}
	const sendCode = () => {
		if (!code) {
			setProblem('Enter the code.')
			return document.getElementById('session-code')?.focus()
		}
		setBusy(true)
		setAlert(null)
		finishTwoStepSignIn(ticket, code)
			.then(() => { setTicket(null); onSignedIn() })
			.catch(e => {
				setBusy(false)
				if (e?.status === 429 && e.body?.retryAfter) return setLockedFor(e.body.retryAfter)
				if (e?.status === 410) return setTimedOut(true)
				setAlert(e?.status === 401 ? CODE_KINDS[kind].wrong : failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
				requestAnimationFrame(() => document.getElementById('session-code')?.select())
			})
	}
	const words = CODE_KINDS[kind]
	const stopped = locked || timedOut

	return (
		<Dialog onCancel={onLater} aria-label="You've been signed out">
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (asking && !stopped && !busy) (ticket ? sendCode : submit)() }}>
				<DialogTitle>You've been signed out</DialogTitle>
				<DialogBody>{ticket ? words.line : 'Your session expired. Sign in again to carry on - nothing was lost.'}</DialogBody>
				{ticket && timedOut
					? <Alert color="warning" mark={<Icon name="clock" />} title="This step timed out">The code has to be typed within 5 minutes of the password. Sign in again from the start.</Alert>
					: ticket && locked
						? <Alert color="warning" mark={<Icon name="lock" />} title="Too many tries">Sign in is paused for <b>{waitWords(lockedFor)}</b>. Then sign in again from the start.</Alert>
						: null}
				{ticket
					? (
						<>
							{alert ? <Alert color="danger" mark={<Icon name="alert-circle" />}>{alert}</Alert> : null}
							<Field label={words.label} id="session-code" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
								<TextField {...words.field} value={code} disabled={stopped || busy}
									onChange={v => { setCode(cleanCode(v)); setProblem(null); setAlert(null) }} />
							</Field>
							{stopped ? null : (
								<span className="sp-meta">
									<ActionLink onClick={() => { setKind(k => (k === 'app' ? 'recovery' : 'app')); setCode(''); setProblem(null); setAlert(null) }}>{words.other}</ActionLink>
								</span>
							)}
						</>
					)
					: null}
				{!ticket && asking && locked
					? <Alert color="warning" mark={<Icon name="lock" />} title="Too many attempts">Sign in is paused for <b>{waitWords(lockedFor)}</b>.</Alert>
					: !ticket && asking && alert ? <Alert color="danger" mark={<Icon name="alert-circle" />}>{alert}</Alert> : null}
				{asking && !ticket
					? (
						<>
							<Field label="Email" id="session-email">
								<TextField type="email" autoComplete="email" value={email} disabled onChange={() => {}} />
							</Field>
							<Field label="Password" id="session-password" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
								<PasswordField autoComplete="current-password" value={password} disabled={locked}
									onChange={v => { setPassword(v); setProblem(null) }} />
							</Field>
						</>
					)
					: null}
				<DialogActions>
					{ticket ? <><Button variant="outline" size="small" onClick={leaveCodeStep}>Back</Button><span className="sp-grow" /></> : null}
					<Button variant="outline" size="small" onClick={onLater}>Later</Button>
					{ticket
						? <Button type="submit" size="small" disabled={busy || stopped}>{busy ? 'Signing in…' : 'Sign in'}</Button>
						: asking
						? <Button type="submit" size="small" disabled={busy || locked}>{busy ? 'Signing in…' : 'Sign in'}</Button>
						: <Button size="small" onClick={() => (email ? setAsking(true) : onSignInPage())}>Sign in</Button>}
				</DialogActions>
			</form>
		</Dialog>
	)
}

/** After Later the page stays to be read and copied; a save asks to sign in again (20e). */
export function SignedOutBanner({ onSignIn }) {
	return (
		<div className="au-banner">
			<ListItem color="warning">
				<Icon name="lock" size={18} />
				<span className="sp-data sp-ink-warning sp-grow">You are signed out. Nothing on this page is lost; sign in again to save.</span>
				<Button variant="text" size="small" color="warning" onClick={onSignIn}>Sign in</Button>
			</ListItem>
		</div>
	)
}
