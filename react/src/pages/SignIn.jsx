import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { cancelTwoStepSignIn, failureMessage, finishTwoStepSignIn, login } from '../api/client.js'
import {
	ActionLink, CODE_KINDS, LOST_BOTH, bold, cleanCode, EMAIL_PATTERN, EMAIL_PROBLEM, useFocusField, waitWords, useCountdown, AuthCard, landing, onward, useAuthOptions, useSignedOut, useMail
} from './AuthParts.jsx'
import { useShellShape } from '../app/useMedia.js'
import { closedPrompt, deviceFailed, passkeysHere, signInWithPasskey, stopPasskeyOffer } from '../app/passkeys.js'
import { usePhrase } from '../language/phrases.js'

export default function SignIn() {
	const phrase = usePhrase()
	const focusField = useFocusField()
	const navigate = useNavigate()
	const [params] = useSearchParams()
	// a confirming link hands its address over (20b), so only the password is left to type
	const [email, setEmail] = useState(params.get('email') ?? '')
	const [given] = useState(Boolean(email))
	const [password, setPassword] = useState('')
	const [remember, setRemember] = useState(true)
	const remembered = useRef(remember)
	remembered.current = remember
	const [emailProblem, setEmailProblem] = useState(null)
	const [passwordProblem, setPasswordProblem] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const [lockedFor, setLockedFor] = useCountdown()
	const [ticket, setTicket] = useState(null)
	const [kind, setKind] = useState('app')
	const [code, setCode] = useState('')
	const [codeProblem, setCodeProblem] = useState(null)
	const [codeWait, setCodeWait] = useCountdown()
	const [timedOut, setTimedOut] = useState(false)
	const mail = useMail()
	const passkeys = passkeysHere(useAuthOptions())
	const [asking, setAsking] = useState(false)
	const touch = useShellShape() === 'touch'
	const signedOut = useSignedOut()
	const locked = lockedFor > 0
	const resetTo = `/reset${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ''}`

	const checkEmail = () => {
		const ok = !email.trim() || EMAIL_PATTERN.test(email.trim())
		setEmailProblem(ok ? null : phrase(EMAIL_PROBLEM))
		return ok
	}

	// an empty field is named on its own, as Register does; only a sent pair is answered vaguely (20a)
	const submit = () => {
		if (locked) return mail ? navigate(resetTo) : null
		const emailOk = checkEmail() && EMAIL_PATTERN.test(email.trim())
		if (!emailOk) setEmailProblem(phrase(EMAIL_PROBLEM))
		const passwordOk = password !== ''
		setPasswordProblem(passwordOk ? null : phrase('signIn.passwordMissing'))
		if (!emailOk || !passwordOk) return focusField(emailOk ? 'signin-password' : 'signin-email')
		setBusy(true)
		setAlert(null)
		login(email.trim().toLowerCase(), password, remember)
			.then(user => {
				if (!user.twoStep) return navigate(onward(user, landing(params)), { replace: true })
				setBusy(false)
				setPassword('')
				setKind('app')
				setCode('')
				setTicket(user.ticket)
				focusField('signin-code')
			})
			.catch(e => {
				setBusy(false)
				if (e?.status === 429 && e.body?.retryAfter) {
					setAlert(null)
					setLockedFor(e.body.retryAfter)
					return
				}
				setAlert(e?.status === 401
					? phrase('signIn.wrong')
					: failureMessage(e, phrase('failed.unreachable')))
				document.getElementById('signin-password')?.focus()
			})
	}

	// Back, Back to sign in and Start again: the email stays, the password is typed again
	const leaveCodeStep = () => {
		if (ticket && !timedOut) cancelTwoStepSignIn(ticket).catch(() => {})
		setTicket(null)
		setTimedOut(false)
		setCodeWait(0)
		setCodeProblem(null)
		setAlert(null)
		focusField('signin-password')
	}
	const switchKind = () => {
		setKind(k => (k === 'app' ? 'recovery' : 'app'))
		setCode('')
		setCodeProblem(null)
		focusField('signin-code')
	}
	const sendCode = () => {
		if (codeWait > 0 || timedOut) return leaveCodeStep()
		if (!code) {
			setCodeProblem(phrase('signIn.codeMissing'))
			return focusField('signin-code')
		}
		setBusy(true)
		setAlert(null)
		finishTwoStepSignIn(ticket, code)
			.then(user => navigate(onward(user, landing(params)), { replace: true }))
			.catch(e => {
				setBusy(false)
				if (e?.status === 429 && e.body?.retryAfter) return setCodeWait(e.body.retryAfter)
				if (e?.status === 410) return setTimedOut(true)
				if (e?.status === 401) {
					setCodeProblem(phrase(CODE_KINDS[kind].wrong))
					// the code is kept and selected, so the next one types over it
					return requestAnimationFrame(() => document.getElementById('signin-code')?.select())
				}
				setAlert(failureMessage(e, phrase('failed.unreachable')))
			})
	}

	/* A passkey signs in beside the password, never instead of it (20a). A closed prompt says nothing;
	   a refused passkey gets the vague error. A lock-out pauses passwords only. */
	const withPasskey = autofill => {
		if (!autofill) setAsking(true)
		return signInWithPasskey({ autofill, remember: () => remembered.current })
			.then(user => { if (user) navigate(onward(user, landing(params)), { replace: true }) })
			.catch(e => {
				if (closedPrompt(e)) return
				setAlert(deviceFailed(e) ? phrase('signIn.passkeyFailed') : failureMessage(e, phrase('failed.unreachable')))
			})
			.finally(() => { if (!autofill) setAsking(false) })
	}
	// the browser offers a saved passkey from the email field as the page opens, where it can
	useEffect(() => {
		if (!signedOut || !passkeys) return
		withPasskey(true)
		return stopPasskeyOffer
	}, [signedOut, passkeys])
	const passkeyButton = passkeys
		? (
			<>
				<span className="sp-divider">{phrase('signIn.or')}</span>
				<Button variant="outline" size="small" fullWidth disabled={asking} onClick={() => withPasskey(false)}>
					<Icon name="key" size={14} />{phrase('signIn.withPasskey')}
				</Button>
			</>
		)
		: null

	// on the Password label's line on a computer; below 640 a full-width button under the field (20a)
	const canReset = mail && !locked

	if (!signedOut) return null
	if (ticket) {
		const words = CODE_KINDS[kind]
		const waiting = codeWait > 0
		const back = <ActionLink onClick={leaveCodeStep}>{phrase('action.back')}</ActionLink>
		if (timedOut) return (
			<AuthCard title={phrase('signIn.twoStep')} alertColor="warning" alertIcon="clock" alertTitle={phrase('signIn.timedOut')}
				alert={phrase('signIn.timedOutBody')}
				onSubmit={leaveCodeStep} submit={phrase('signIn.startAgain')} across={back} note={phrase(LOST_BOTH)} />
		)
		return (
			<AuthCard title={phrase('signIn.twoStep')} lead={waiting ? null : phrase(words.line)}
				alert={waiting ? phrase('signIn.pausedStartAgain', { wait: waitWords(codeWait), b: bold }) : alert}
				alertColor={waiting ? 'warning' : 'danger'} alertIcon={waiting ? 'lock' : 'alert-circle'} alertTitle={phrase('signIn.tooManyTries')}
				onSubmit={sendCode} submit={phrase(waiting ? 'signIn.backToSignIn' : 'page.signIn')} busy={busy} busyLabel={phrase('signIn.busy')}
				secondary={waiting ? null : <span className="sp-data sp-center"><ActionLink onClick={switchKind}>{phrase(words.other)}</ActionLink></span>}
				across={back} note={phrase(LOST_BOTH)}>
				<Field label={phrase(words.label)} id="signin-code" message={codeProblem ?? undefined} messageType={codeProblem ? 'danger' : 'hint'}>
					<TextField {...words.field} code value={code} disabled={waiting || busy}
						onChange={v => { setCode(cleanCode(v)); setCodeProblem(null) }} />
				</Field>
			</AuthCard>
		)
	}
	if (locked) return (
		<AuthCard title={phrase('signIn.title')} alertColor="warning" alertIcon="lock" alertTitle={phrase('signIn.tooManyAttempts')}
			alert={phrase(mail ? 'signIn.pausedReset' : 'signIn.paused', { wait: waitWords(lockedFor), b: bold })}
			onSubmit={submit} submit={phrase(mail ? 'signIn.resetMine' : 'page.signIn')} disabled={!mail} gap={12}
			note={alert ?? phrase(mail ? 'signIn.orWait' : 'signIn.wait', { wait: waitWords(lockedFor) })}
			secondary={passkeyButton}>
			<Field label={phrase('field.email')} id="signin-email">
				<TextField type="email" autoComplete="username webauthn" value={email} disabled onChange={() => {}} />
			</Field>
			<Field label={phrase('field.password')} id="signin-password">
				<PasswordField autoComplete="current-password" value={password} disabled onChange={() => {}} />
			</Field>
		</AuthCard>
	)
	return (
		<AuthCard title={phrase('signIn.title')} lead={alert ? null : phrase('signIn.lead')} alert={alert}
			onSubmit={submit} submit={phrase('page.signIn')} busy={busy} busyLabel={phrase('signIn.busy')} secondary={passkeyButton}
			across={alert ? null : phrase('signIn.newHere', { register: words => <Link className="sp-strong au-across" to="/register">{words}</Link> })}>
			<Field label={phrase('field.email')} id="signin-email" message={emailProblem ?? undefined} messageType={emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="username webauthn" inputMode="email" autoFocus={!given && !touch} value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			<Field label={phrase('field.password')} id="signin-password"
				labelAction={canReset && !touch ? <Button variant="outline" size="xsmall" to={resetTo}>{phrase('signIn.forgot')}</Button> : null}
				message={passwordProblem ?? undefined} messageType={passwordProblem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="current-password" autoFocus={given && !touch} value={password}
					onChange={v => { setPassword(v); setPasswordProblem(null) }} />
			</Field>
			{canReset && touch ? <Button variant="outline" fullWidth to={resetTo}>{phrase('signIn.forgot')}</Button> : null}
			{alert ? null : (
				<Choice control={<Check checked={remember} onChange={ev => setRemember(ev.target.checked)} />}>
					{phrase('signIn.stay')}
				</Choice>
			)}
		</AuthCard>
	)
}
