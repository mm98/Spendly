import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import {
	askPasswordReset, changeEmail, confirmEmail, failureMessage, getCurrentUser, readResetLink, resendConfirmation, resetPassword
} from '../api/client.js'
import {
	AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, MIN_PASSWORD, PasswordHint, focusField, onward, useCountdown, useMail
} from './SignIn.jsx'

const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const NO_MAIL = 'This Spendly server cannot send email. Ask the person who runs it to reset your password for you.'
const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'

/* The confirming link's answer, asked once per token: opening it twice must read "already". */
const confirmed = new Map()
const confirmOnce = token => {
	if (!confirmed.has(token)) confirmed.set(token, confirmEmail(token))
	return confirmed.get(token)
}

/** "Wrong address? Change it": the address field in place of the line, then a new link to it. */
function ChangeAddress({ onSent }) {
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	if (!open) return (
		<span className="sp-subtitle sp-center">
			Wrong address? <Button variant="text" size="small" onClick={() => { setOpen(true); focusField('confirm-email') }}>Change it</Button>
		</span>
	)
	const send = () => {
		const address = email.trim().toLowerCase()
		if (!EMAIL_PATTERN.test(address)) { setProblem(EMAIL_PROBLEM); return focusField('confirm-email') }
		setBusy(true)
		changeEmail(address)
			.then(out => { setOpen(false); setEmail(''); onSent(out) })
			.catch(e => { setProblem(failureMessage(e, UNREACHABLE)); focusField('confirm-email') })
			.finally(() => setBusy(false))
	}
	return (
		<div className="sp-stack sp-gap-8">
			<Field label="New email" id="confirm-email" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" value={email}
					onChange={v => { setEmail(v); setProblem(null) }}
					onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); send() } }} />
			</Field>
			<span className="sp-subtitle sp-center">
				<Button variant="text" size="small" disabled={busy} onClick={send}>Send the link there</Button>
			</span>
		</div>
	)
}

/** /confirm: the page that says a link was sent (20b 1 and 2). */
export function ConfirmSent() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [again, setAgain] = useState(false)
	const [wait, setWait] = useCountdown()
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	useEffect(() => {
		getCurrentUser()
			.then(me => {
				if (me.emailConfirmed && !me.pendingEmail) navigate(onward(me, '/'), { replace: true })
				else setUser(me)
			})
			.catch(() => navigate('/signin?next=%2Fconfirm', { replace: true }))
	}, [])
	if (!user) return null
	const address = user.pendingEmail ?? user.email
	const sent = out => {
		setUser(u => ({ ...u, ...(u.emailConfirmed ? { pendingEmail: out.email } : { email: out.email }) }))
		setAgain(true)
		setWait(out.retryAfter ?? 60)
	}
	const resend = () => {
		setBusy(true)
		setAlert(null)
		resendConfirmation()
			.then(sent)
			.catch(e => {
				if (e?.status === 429 && e.body?.retryAfter) setWait(e.body.retryAfter)
				else setAlert(failureMessage(e, UNREACHABLE))
			})
			.finally(() => setBusy(false))
	}
	return (
		<AuthCard mark={false} title={again ? 'Sent again' : 'Confirm your email'}
			lead={again
				? <>A new link is on its way to <b className="sp-ink">{address}</b>. The earlier one no longer works.</>
				: <>We sent a link to <b className="sp-ink">{address}</b>. Open it and you're in. It expires in 24 hours.</>}
			alert={alert} onSubmit={resend} submitVariant="outline" busy={busy} busyLabel="Sending…"
			disabled={wait > 0} submit={wait > 0 ? `Send again in ${clock(wait)}` : again ? 'Send again' : 'Send it again'}
			across={<ChangeAddress onSent={sent} />}
			footer={<span className="sp-meta sp-center sp-grow">Nothing after a few minutes? Check spam.</span>} />
	)
}

/** /confirm/:token: where the email's link lands (20b 3 and 4). */
export function ConfirmLink() {
	const { token } = useParams()
	const navigate = useNavigate()
	const [answer, setAnswer] = useState(null)
	const [me, setMe] = useState(undefined)
	useEffect(() => {
		confirmOnce(token)
			.then(setAnswer)
			.catch(e => setAnswer({ state: 'failed', error: failureMessage(e, UNREACHABLE) }))
			.finally(() => getCurrentUser().then(setMe).catch(() => setMe(null)))
	}, [token])
	if (!answer || me === undefined) return null
	const next = me ? onward(me, '/') : '/signin'
	if (answer.state === 'confirmed' || answer.state === 'already') return (
		<AuthCard mark={false} title={answer.state === 'confirmed' ? 'Email confirmed' : 'Already confirmed'}
			lead={!me ? 'Sign in to carry on.' : me.needsSetup ? "You're signed in. Two quick choices and you're done." : "You're signed in."}
			onSubmit={() => navigate(next, { replace: true })} submit={me ? 'Continue' : 'Sign in'} />
	)
	if (answer.state === 'failed') return (
		<AuthCard mark={false} title="That link could not be checked" alert={answer.error}
			onSubmit={() => window.location.reload()} submit="Try again" />
	)
	const address = answer.email ?? me?.pendingEmail ?? me?.email
	return (
		<AuthCard mark={false} title="That link has expired"
			lead={<>Links last 24 hours and work once.{address ? <> We can send a fresh one to <b className="sp-ink">{address}</b>.</> : null}</>}
			onSubmit={() => navigate(me ? '/confirm' : '/signin?next=%2Fconfirm')}
			submit={me ? 'Send a new link' : 'Sign in to get a new link'} />
	)
}

/** /reset: ask for a link (20c 1 and 2). The answer is the same whether or not the address has an account. */
export function ResetAsk() {
	const [params] = useSearchParams()
	const mail = useMail()
	const [email, setEmail] = useState(params.get('email') ?? '')
	const [problem, setProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const [sentTo, setSentTo] = useState(null)
	const [wait, setWait] = useCountdown()
	const back = <Link className="sp-title sp-ink-accent" to="/signin">Back to sign in</Link>

	const send = () => {
		const address = email.trim().toLowerCase()
		if (!EMAIL_PATTERN.test(address)) { setProblem(EMAIL_PROBLEM); return focusField('reset-email') }
		setBusy(true)
		setAlert(null)
		askPasswordReset(address)
			.then(() => { setSentTo(address); setWait(60) })
			.catch(e => setAlert(failureMessage(e, UNREACHABLE)))
			.finally(() => setBusy(false))
	}

	if (sentTo) return (
		<AuthCard mark={false} title="Check your email"
			lead={<>If there's an account for <b className="sp-ink">{sentTo}</b>, a reset link is on its way. It works once, and expires in an hour.</>}
			alert={alert} onSubmit={send} submitVariant="outline" busy={busy} busyLabel="Sending…"
			disabled={wait > 0} submit={wait > 0 ? `Send again in ${clock(wait)}` : 'Send it again'}
			note="Nothing after a few minutes? Check spam, or try another address."
			across={<Button variant="text" size="small" onClick={() => { setSentTo(null); focusField('reset-email') }}>Try another address</Button>} />
	)
	return (
		<AuthCard title="Reset your password" lead={mail ? "Enter the email you signed up with and we'll send a link." : null}
			alert={mail ? alert : NO_MAIL} alertColor={mail ? 'danger' : 'warning'} alertTitle="Email is not set up"
			onSubmit={send} submit="Send the link" busy={busy} busyLabel="Sending…" disabled={!mail} across={back}>
			<Field label="Email" id="reset-email" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus value={email}
					placeholder="you@example.com" onChange={v => { setEmail(v); setProblem(null) }} />
			</Field>
		</AuthCard>
	)
}

/** /reset/:token: the new password, or the expired link's way back (20c 3 and expired). */
export function ResetLink() {
	const { token } = useParams()
	const navigate = useNavigate()
	const [link, setLink] = useState(null)
	const [password, setPassword] = useState('')
	const [problem, setProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	useEffect(() => {
		readResetLink(token).then(setLink).catch(e => setLink({ state: 'failed', error: failureMessage(e, UNREACHABLE) }))
	}, [token])
	if (!link) return null
	if (link.state === 'failed') return (
		<AuthCard mark={false} title="That link could not be checked" alert={link.error}
			onSubmit={() => window.location.reload()} submit="Try again" />
	)
	if (link.state !== 'valid') return (
		<AuthCard mark={false} title="That link has expired"
			lead="Reset links last an hour and work once. Ask for a new one and we'll send it straight away."
			onSubmit={() => navigate(link.email ? `/reset?email=${encodeURIComponent(link.email)}` : '/reset')} submit="Start again"
			across={<Link className="sp-title sp-ink-accent" to="/signin">Back to sign in</Link>} />
	)
	const save = () => {
		if (password.length < MIN_PASSWORD) { setProblem(`Use at least ${MIN_PASSWORD} characters.`); return focusField('reset-password') }
		setBusy(true)
		setAlert(null)
		resetPassword(token, password)
			.then(() => getCurrentUser())
			.then(me => navigate(onward(me, '/'), { replace: true }))
			.catch(e => {
				setBusy(false)
				if (e?.status === 410) setLink(l => ({ ...l, state: 'expired' }))
				else setAlert(failureMessage(e, UNREACHABLE))
			})
	}
	return (
		<AuthCard title="Choose a new password" lead={`For ${link.email}`} alert={alert}
			onSubmit={save} submit="Save and sign in" busy={busy} busyLabel="Saving…"
			note="This signs you out everywhere else.">
			<Field label="New password" id="reset-password"
				message={problem ?? <PasswordHint password={password} hint={`At least ${MIN_PASSWORD} characters. Longer beats complicated.`} />}
				messageType={problem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="new-password" autoFocus value={password}
					onChange={v => { setPassword(v); setProblem(null) }} />
			</Field>
		</AuthCard>
	)
}
