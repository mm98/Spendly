import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import {
	askPasswordReset, confirmEmail, failureMessage, getCurrentUser, readResetLink, resendConfirmation, resetPassword, stopStatusEmail
} from '../api/client.js'
import {
	AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, MIN_PASSWORD, PasswordHint, useFocusField, onward, useAuthOptions, useCountdown, useMail
} from './AuthParts.jsx'
import { addPasskeyHere, alreadyHere, closedPrompt, deviceFailed, passkeysHere } from '../app/passkeys.js'
import { useShellShape } from '../app/useMedia.js'
import { usePhrase } from '../language/phrases.js'

const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
// an address set in bold inside a phrase: `<b>{email}</b>`
const address = words => <b className="sp-ink sp-break">{words}</b>

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
	const phrase = usePhrase()
	const { token } = useParams()
	const navigate = useNavigate()
	const [answer, setAnswer] = useState(null)
	useEffect(() => {
		stopOnce(token)
			.then(setAnswer)
			.catch(e => setAnswer({ state: 'failed', error: failureMessage(e, phrase('failed.unreachable')) }))
	}, [token])
	if (!answer) return null
	const open = () => navigate('/', { replace: true })
	if (answer.state === 'stopped') return (
		<AuthCard icon="check" title={phrase('links.stop.done')}
			lead={phrase('links.stop.doneLead', { email: answer.email, b: address })}
			onSubmit={open} submit={phrase('links.openSpendly')} />
	)
	if (answer.state === 'used') return (
		<AuthCard icon="check" title={phrase('links.stop.already')}
			lead={phrase('links.stop.alreadyLead', { email: answer.email, b: address })}
			onSubmit={open} submit={phrase('links.openSpendly')} />
	)
	if (answer.state === 'failed') return (
		<AuthCard mark={false} title={phrase('links.notChecked')} alert={answer.error}
			onSubmit={() => window.location.reload()} submit={phrase('action.tryAgain')} />
	)
	return (
		<AuthCard icon="clock" title={phrase('links.expired')}
			lead={phrase('links.stop.expiredLead')}
			onSubmit={() => navigate('/settings/account', { replace: true })} submit={phrase('links.openSettings')} />
	)
}

/** /confirm: the page that says a link was sent (20b 1 and 2). */
export function ConfirmSent() {
	const phrase = usePhrase()
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
	const resend = () => {
		setBusy(true)
		setAlert(null)
		resendConfirmation()
			.then(sent)
			.catch(e => {
				if (e?.status === 429 && e.body?.retryAfter) setWait(e.body.retryAfter)
				else setAlert(failureMessage(e, phrase('failed.unreachable')))
			})
			.finally(() => setBusy(false))
	}
	return (
		<AuthCard icon={again ? 'check' : 'mail'} gap={10} title={phrase(again ? 'links.confirm.sentAgain' : 'page.confirmYourEmail')}
			lead={phrase(again ? 'links.confirm.sentAgainLead' : 'links.confirm.sentLead', { email: user.email, b: address })}
			alert={alert} onSubmit={resend} submitVariant="outline" busy={busy} busyLabel={phrase('links.sending')}
			disabled={wait > 0} submitIcon={wait > 0 ? 'clock' : null}
			submit={wait > 0 ? phrase('links.sendAgainIn', { time: clock(wait) }) : phrase(again ? 'links.sendAgain' : 'links.sendItAgain')}
			footer={<span className="sp-meta sp-center sp-grow">{phrase('links.checkSpam')}</span>} />
	)
}

/** /confirm/:token: where the email's link lands (20b 3 and 4). */
export function ConfirmLink() {
	const phrase = usePhrase()
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
			.catch(e => setAnswer({ state: 'failed', error: failureMessage(e, phrase('failed.unreachable')) }))
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
				setAlert(alreadyHere(e) ? phrase('passkey.alreadyHere')
					: deviceFailed(e) ? phrase('passkey.notAdded') : failureMessage(e, phrase('failed.unreachable')))
			})
	}
	if (answer.state === 'confirmed' || answer.state === 'already') return (
		<AuthCard icon="check" title={phrase(answer.state === 'confirmed' ? 'links.confirm.done' : 'links.confirm.already')}
			lead={phrase(!me ? 'links.confirm.signIn' : offer ? 'links.confirm.offerPasskey' : me.needsSetup ? 'links.confirm.setup' : 'links.confirm.signedIn')}
			alert={offer ? alert : null} gap={offer ? 12 : 14}
			onSubmit={offer ? add : go} submit={phrase(!me ? 'page.signIn' : offer ? 'passkey.add' : 'action.continue')} submitIcon={offer ? 'key' : null}
			busy={busy} busyLabel={phrase('links.adding')}
			secondary={offer ? <Button variant="outline" size="small" fullWidth disabled={busy} onClick={go}>{phrase('action.notNow')}</Button> : null} />
	)
	if (answer.state === 'failed') return (
		<AuthCard mark={false} title={phrase('links.notChecked')} alert={answer.error}
			onSubmit={() => window.location.reload()} submit={phrase('action.tryAgain')} />
	)
	const email = answer.email ?? me?.email
	const sendNew = () => {
		if (!me) return navigate('/signin?next=%2Fconfirm')
		setBusy(true)
		setAlert(null)
		resendConfirmation()
			.then(out => navigate('/confirm', { state: { sent: out } }))
			.catch(e => {
				if (e?.status === 429 && e.body?.retryAfter) return navigate('/confirm', { state: { wait: e.body.retryAfter } })
				setBusy(false)
				setAlert(failureMessage(e, phrase('failed.unreachable')))
			})
	}
	return (
		<AuthCard icon="clock" gap={12} title={phrase('links.expired')}
			lead={phrase(email ? 'links.confirm.expiredLeadTo' : 'links.confirm.expiredLead', { email, b: address })}
			alert={alert} onSubmit={sendNew} busy={busy} busyLabel={phrase('links.sending')}
			submit={phrase(me ? 'links.confirm.sendNew' : 'links.confirm.signInForNew')} />
	)
}

/** /reset: ask for a link (20c 1 and 2). The answer is the same whether or not the address has an account. */
export function ResetAsk() {
	const phrase = usePhrase()
	const focusField = useFocusField()
	const touch = useShellShape() === 'touch'
	const [params] = useSearchParams()
	const mail = useMail()
	const [email, setEmail] = useState(params.get('email') ?? '')
	const [problem, setProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const [sentTo, setSentTo] = useState(null)
	const [wait, setWait] = useCountdown()
	const back = <Button variant="outline" size="small" fullWidth to="/signin">{phrase('signIn.backToSignIn')}</Button>

	const send = () => {
		const address = email.trim().toLowerCase()
		if (!EMAIL_PATTERN.test(address)) { setProblem(phrase(EMAIL_PROBLEM)); return focusField('reset-email') }
		setBusy(true)
		setAlert(null)
		askPasswordReset(address)
			.then(() => { setSentTo(address); setWait(60) })
			.catch(e => setAlert(failureMessage(e, phrase('failed.unreachable'))))
			.finally(() => setBusy(false))
	}

	if (mail === null) return null
	if (sentTo) return (
		<AuthCard icon="mail" gap={10} title={phrase('links.reset.checkEmail')}
			lead={phrase('links.reset.sentLead', { email: sentTo, b: address })}
			alert={alert} onSubmit={send} submitVariant="outline" busy={busy} busyLabel={phrase('links.sending')}
			disabled={wait > 0} submitIcon={wait > 0 ? 'clock' : null}
			submit={wait > 0 ? phrase('links.sendAgainIn', { time: clock(wait) }) : phrase('links.sendItAgain')}
			note={phrase('links.reset.checkSpam')} />
	)
	return (
		<AuthCard title={phrase('page.resetYourPassword')} lead={mail ? phrase('links.reset.lead') : null}
			alert={mail ? alert : phrase('links.reset.noMail')} alertColor={mail ? 'danger' : 'warning'} alertTitle={phrase('links.reset.noMailTitle')}
			onSubmit={send} submit={phrase('links.reset.send')} busy={busy} busyLabel={phrase('links.sending')} disabled={!mail} gap={12} secondary={back}>
			<Field label={phrase('field.email')} id="reset-email" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus={!touch} value={email}
					placeholder={phrase('field.emailExample')} onChange={v => { setEmail(v); setProblem(null) }} />
			</Field>
		</AuthCard>
	)
}

/** /reset/:token: the new password, or the expired link's way back (20c 3 and expired). */
export function ResetLink() {
	const phrase = usePhrase()
	const focusField = useFocusField()
	const touch = useShellShape() === 'touch'
	const { token } = useParams()
	const navigate = useNavigate()
	const [link, setLink] = useState(null)
	const [password, setPassword] = useState('')
	const [problem, setProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	useEffect(() => {
		readResetLink(token).then(setLink).catch(e => setLink({ state: 'failed', error: failureMessage(e, phrase('failed.unreachable')) }))
	}, [token])
	if (!link) return null
	if (link.state === 'failed') return (
		<AuthCard mark={false} title={phrase('links.notChecked')} alert={link.error}
			onSubmit={() => window.location.reload()} submit={phrase('action.tryAgain')} />
	)
	if (link.state !== 'valid') return (
		<AuthCard icon="clock" gap={12} title={phrase('links.expired')}
			lead={phrase('links.reset.expiredLead')}
			onSubmit={() => navigate(link.email ? `/reset?email=${encodeURIComponent(link.email)}` : '/reset')} submit={phrase('signIn.startAgain')}
			secondary={<Button variant="outline" size="small" fullWidth to="/signin">{phrase('signIn.backToSignIn')}</Button>} />
	)
	const save = () => {
		if (password.length < MIN_PASSWORD) { setProblem(phrase('auth.passwordTooShort', { count: MIN_PASSWORD })); return focusField('reset-password') }
		setBusy(true)
		setAlert(null)
		resetPassword(token, password)
			.then(() => getCurrentUser())
			.then(me => navigate(onward(me, '/'), { replace: true }))
			.catch(e => {
				setBusy(false)
				if (e?.status === 410) setLink(l => ({ ...l, state: 'expired' }))
				else setAlert(failureMessage(e, phrase('failed.unreachable')))
			})
	}
	return (
		<AuthCard title={phrase('page.chooseANewPassword')} lead={phrase('links.reset.for', { email: link.email, span: words => <span className="sp-break">{words}</span> })} alert={alert}
			onSubmit={save} submit={phrase('links.reset.save')} busy={busy} busyLabel={phrase('action.saving')} gap={12}
			note={phrase('links.reset.signsOut')}>
			<Field label={phrase('field.newPassword')} id="reset-password"
				message={problem ?? <PasswordHint password={password} hint={phrase('register.passwordHint', { count: MIN_PASSWORD })} />}
				messageType={problem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="new-password" autoFocus={!touch} value={password}
					onChange={v => { setPassword(v); setProblem(null) }} />
			</Field>
		</AuthCard>
	)
}
