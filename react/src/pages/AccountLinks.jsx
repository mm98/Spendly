import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import {
	askPasswordReset, confirmEmail, failureMessage, getCurrentUser, readResetLink, resendConfirmation, resetPassword, stopStatusEmail
} from '../api/client.js'
import {
	AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, MIN_PASSWORD, PasswordHint, focusField, onward, useAuthOptions, useCountdown, useMail
} from './AuthParts.jsx'
import { addPasskeyHere, alreadyHere, closedPrompt, deviceFailed, passkeysHere } from '../app/passkeys.js'

const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const NO_MAIL = 'This Spendly server cannot send email. Ask the person who runs it to reset your password for you.'
const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'

/* The confirming link's answer, asked once per token: opening it twice must read "already". */
const confirmed = new Map()
const confirmOnce = token => {
	if (!confirmed.has(token)) confirmed.set(token, confirmEmail(token))
	return confirmed.get(token)
}

/* The stop link's answer, asked once per token, as the confirming link's is. */
const stopped = new Map()
const stopOnce = token => {
	if (!stopped.has(token)) stopped.set(token, stopStatusEmail(token))
	return stopped.get(token)
}

/** /email/stop/:token: Stop these emails, from a status email (20f). It sets the status email to None
    without signing in, in the shape of the confirming link's answer. */
export function StatusEmailStop() {
	const { token } = useParams()
	const navigate = useNavigate()
	const [answer, setAnswer] = useState(null)
	useEffect(() => {
		stopOnce(token)
			.then(setAnswer)
			.catch(e => setAnswer({ state: 'failed', error: failureMessage(e, UNREACHABLE) }))
	}, [token])
	if (!answer) return null
	const open = () => navigate('/', { replace: true })
	const address = <b className="sp-ink sp-break">{answer.email}</b>
	if (answer.state === 'stopped') return (
		<AuthCard icon="check" title="Status emails stopped"
			lead={<>You won't get the weekly or monthly status email at {address} any more. You can turn it back on in Settings.</>}
			onSubmit={open} submit="Open Spendly" />
	)
	if (answer.state === 'used') return (
		<AuthCard icon="check" title="Already stopped"
			lead={<>Status emails to {address} are already off. You can turn them back on in Settings.</>}
			onSubmit={open} submit="Open Spendly" />
	)
	if (answer.state === 'failed') return (
		<AuthCard mark={false} title="That link could not be checked" alert={answer.error}
			onSubmit={() => window.location.reload()} submit="Try again" />
	)
	return (
		<AuthCard icon="clock" title="That link has expired"
			lead="Stop links last 60 days. You can turn status emails off in Settings."
			onSubmit={() => navigate('/settings/account', { replace: true })} submit="Open Settings" />
	)
}

/** /confirm: the page that says a link was sent (20b 1 and 2). */
export function ConfirmSent() {
	const navigate = useNavigate()
	// the expired link's own resend arrives here already sent, or already throttled
	const { state } = useLocation()
	const [user, setUser] = useState(null)
	const [again, setAgain] = useState(false)
	const [wait, setWait] = useCountdown()
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const sent = out => {
		setAgain(true)
		setWait(out.retryAfter ?? 60)
	}
	useEffect(() => {
		getCurrentUser()
			.then(me => {
				if (me.emailConfirmed) return navigate(onward(me, '/'), { replace: true })
				setUser(me)
				if (state?.sent) sent(state.sent)
				else if (state?.wait) setWait(state.wait)
			})
			.catch(() => navigate('/signin?next=%2Fconfirm', { replace: true }))
	}, [])
	if (!user) return null
	const address = user.email
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
		<AuthCard icon={again ? 'check' : 'mail'} gap={10} title={again ? 'Sent again' : 'Confirm your email'}
			lead={again
				? <>A new link is on its way to <b className="sp-ink sp-break">{address}</b>. The earlier one no longer works.</>
				: <>We sent a link to <b className="sp-ink sp-break">{address}</b>. Open it to confirm your address, then sign in if asked. It expires in 24 hours.</>}
			alert={alert} onSubmit={resend} submitVariant="outline" busy={busy} busyLabel="Sending…"
			disabled={wait > 0} submitIcon={wait > 0 ? 'clock' : null}
			submit={wait > 0 ? `Send again in ${clock(wait)}` : again ? 'Send again' : 'Send it again'}
			footer={<span className="sp-meta sp-center sp-grow">Nothing after a few minutes? Check spam.</span>} />
	)
}

/** /confirm/:token: where the email's link lands (20b 3 and 4). */
export function ConfirmLink() {
	const { token } = useParams()
	const navigate = useNavigate()
	const [answer, setAnswer] = useState(null)
	const [me, setMe] = useState(undefined)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const options = useAuthOptions()
	useEffect(() => {
		confirmOnce(token)
			.then(setAnswer)
			.catch(e => setAnswer({ state: 'failed', error: failureMessage(e, UNREACHABLE) }))
			.finally(() => getCurrentUser().then(setMe).catch(() => setMe(null)))
	}, [token])
	if (!answer || me === undefined || !options) return null
	const next = me ? onward(me, '/') : answer.email ? `/signin?email=${encodeURIComponent(answer.email)}` : '/signin'
	const go = () => navigate(next, { replace: true })
	// signed in here, so a passkey can be added on the spot; then first run, as Not now goes straight there (20b)
	const offer = me && passkeysHere(options)
	const add = () => {
		setBusy(true)
		setAlert(null)
		addPasskeyHere()
			.then(go)
			.catch(e => {
				setBusy(false)
				if (closedPrompt(e)) return
				setAlert(alreadyHere(e) ? 'This device already has a passkey for your account.'
					: deviceFailed(e) ? 'The passkey could not be added. Try again.' : failureMessage(e, UNREACHABLE))
			})
	}
	if (answer.state === 'confirmed' || answer.state === 'already') return (
		<AuthCard icon="check" title={answer.state === 'confirmed' ? 'Email confirmed' : 'Already confirmed'}
			lead={!me ? 'Sign in to carry on.'
				: offer ? "You're signed in. Add a passkey and next time you can sign in with your fingerprint or face."
				: me.needsSetup ? "You're signed in. Two quick choices and you're done." : "You're signed in."}
			alert={offer ? alert : null} gap={offer ? 12 : 14}
			onSubmit={offer ? add : go} submit={!me ? 'Sign in' : offer ? 'Add a passkey' : 'Continue'} submitIcon={offer ? 'key' : null}
			busy={busy} busyLabel="Adding…"
			secondary={offer ? <Button variant="outline" size="small" fullWidth disabled={busy} onClick={go}>Not now</Button> : null} />
	)
	if (answer.state === 'failed') return (
		<AuthCard mark={false} title="That link could not be checked" alert={answer.error}
			onSubmit={() => window.location.reload()} submit="Try again" />
	)
	const address = answer.email ?? me?.email
	const sendNew = () => {
		if (!me) return navigate('/signin?next=%2Fconfirm')
		setBusy(true)
		setAlert(null)
		resendConfirmation()
			.then(out => navigate('/confirm', { state: { sent: out } }))
			.catch(e => {
				if (e?.status === 429 && e.body?.retryAfter) return navigate('/confirm', { state: { wait: e.body.retryAfter } })
				setBusy(false)
				setAlert(failureMessage(e, UNREACHABLE))
			})
	}
	return (
		<AuthCard icon="clock" gap={12} title="That link has expired"
			lead={<>Links last 24 hours and work once.{address ? <> We can send a fresh one to <b className="sp-ink sp-break">{address}</b>.</> : null}</>}
			alert={alert} onSubmit={sendNew} busy={busy} busyLabel="Sending…"
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
	const back = <Button variant="outline" size="small" fullWidth to="/signin">Back to sign in</Button>

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

	if (mail === null) return null
	if (sentTo) return (
		<AuthCard icon="mail" gap={10} title="Check your email"
			lead={<>If there's an account for <b className="sp-ink sp-break">{sentTo}</b>, a reset link is on its way. It works once, and expires in an hour.</>}
			alert={alert} onSubmit={send} submitVariant="outline" busy={busy} busyLabel="Sending…"
			disabled={wait > 0} submitIcon={wait > 0 ? 'clock' : null}
			submit={wait > 0 ? `Send again in ${clock(wait)}` : 'Send it again'}
			note="Nothing after a few minutes? Check spam, or try another address." />
	)
	return (
		<AuthCard title="Reset your password" lead={mail ? "Enter the email you signed up with and we'll send a link." : null}
			alert={mail ? alert : NO_MAIL} alertColor={mail ? 'danger' : 'warning'} alertTitle="Email is not set up"
			onSubmit={send} submit="Send the link" busy={busy} busyLabel="Sending…" disabled={!mail} gap={12} secondary={back}>
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
		<AuthCard icon="clock" gap={12} title="That link has expired"
			lead="Reset links last an hour and work once. Ask for a new one and we'll send it straight away."
			onSubmit={() => navigate(link.email ? `/reset?email=${encodeURIComponent(link.email)}` : '/reset')} submit="Start again"
			secondary={<Button variant="outline" size="small" fullWidth to="/signin">Back to sign in</Button>} />
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
		<AuthCard title="Choose a new password" lead={<>For <span className="sp-break">{link.email}</span></>} alert={alert}
			onSubmit={save} submit="Save and sign in" busy={busy} busyLabel="Saving…" gap={12}
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
