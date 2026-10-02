import { useEffect, useState } from 'react'
import { Link, useMatches, useNavigate, useSearchParams } from 'react-router'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { useShellShape } from '../app/useMedia.js'
import { failureMessage, getCurrentUser, login } from '../api/client.js'

// the server's own rule, so an address it would refuse is named before it is sent
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_PROBLEM = 'Enter a valid email address.'
// after the render that binds the field's message, so it is read out with the field
export const focusField = id => requestAnimationFrame(() => document.getElementById(id)?.focus())

/** Sign in and create an account are one card (20a): the brand, a heading and a line, an
    alert slot, the fields, the submit and the way across to the other one. */
export function AuthCard({ title, lead, alert, onSubmit, submit, busy, busyLabel, disabled = false, across, children }) {
	const shape = useShellShape()
	// outside the shell, so the tab is named here, from the route's own title
	const named = useMatches().at(-1)?.handle?.title
	useEffect(() => { if (named) document.title = `${named} - Spendly` }, [named])
	const card = (
		<Card variant="float">
			<div className="sp-stack sp-gap-12 sp-center">
				<Mark size="large" fill="solid" aria-label="Spendly"><span>S</span></Mark>
				<div className="sp-stack sp-gap-6">
					<span className="sp-heading">{title}</span>
					{lead ? <span className="sp-data">{lead}</span> : null}
				</div>
			</div>
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !disabled) onSubmit() }}>
				{alert
					? (
						<ListItem variant="top" color="danger" role="alert">
							<span className="sp-row-flex sp-flex-none"><Icon name="alert-circle" /></span>
							<span className="sp-data sp-ink-danger">{alert}</span>
						</ListItem>
					)
					: null}
				{children}
				<div className="sp-stack sp-gap-14">
					<Button type="submit" size="small" fullWidth disabled={busy || disabled}>
						{busy ? <><Spinner />{busyLabel}</> : submit}
					</Button>
					<span className="sp-data sp-center">{across}</span>
				</div>
			</form>
		</Card>
	)
	return <div className={shape === 'touch' ? 'sp-auth sp-touch' : 'sp-auth'}>{card}</div>
}

/** Where to go once signed in: the page that sent the reader here, or Home. Never back to
    these two pages, which would only send a signed-in reader on again. */
export const landing = params => {
	const next = params.get('next')
	return next && next.startsWith('/') && !next.startsWith('//') && !/^\/(signin|register)(?![\w-])/.test(next) ? next : '/'
}

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
			.then(() => navigate(landing(params), { replace: true }))
			.catch(e => { if (e?.name !== 'AbortError') setSignedOut(true) })
		return () => ask.abort()
	}, [])
	return signedOut
}

export default function SignIn() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [emailProblem, setEmailProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const signedOut = useSignedOut()

	const checkEmail = () => {
		const ok = !email.trim() || EMAIL_PATTERN.test(email.trim())
		setEmailProblem(ok ? null : EMAIL_PROBLEM)
		return ok
	}

	const submit = () => {
		if (!checkEmail()) return focusField('signin-email')
		setBusy(true)
		setAlert(null)
		login(email.trim().toLowerCase(), password)
			.then(() => navigate(landing(params), { replace: true }))
			.catch(e => {
				setBusy(false)
				setAlert(e?.status === 401
					? "That email and password don't match. Check both and try again."
					: failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
				document.getElementById('signin-password')?.focus()
			})
	}

	if (!signedOut) return null
	return (
		<AuthCard title="Sign in to Spendly" lead={alert ? null : 'Your orders, receipts and monthly limits.'} alert={alert}
			onSubmit={submit} submit="Sign in" busy={busy} busyLabel="Signing in…"
			across={<>New here? <Link className="sp-strong sp-ink-accent au-across" to="/register">Create an account</Link></>}>
			<Field label="Email" id="signin-email" message={emailProblem ?? undefined} messageType={emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			<Field label="Password" id="signin-password">
				<PasswordField autoComplete="current-password" value={password} onChange={setPassword} />
			</Field>
		</AuthCard>
	)
}
