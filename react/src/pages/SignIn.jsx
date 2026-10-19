import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Check, Choice } from '../components/Choice.jsx'
import { Icon } from '../components/Icon.jsx'
import { failureMessage, login } from '../api/client.js'
import {
	EMAIL_PATTERN, EMAIL_PROBLEM, focusField, waitWords, useCountdown, AuthCard, landing, onward, useAuthOptions, useSignedOut, useMail
} from './AuthParts.jsx'
import { useShellShape } from '../app/useMedia.js'
import { closedPrompt, deviceFailed, passkeysHere, signInWithPasskey, stopPasskeyOffer } from '../app/passkeys.js'

const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'
const PASSKEY_FAILED = "That passkey didn't work. Try again, or use your password."

export default function SignIn() {
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
	const mail = useMail()
	const passkeys = passkeysHere(useAuthOptions())
	const [asking, setAsking] = useState(false)
	const touch = useShellShape() === 'touch'
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
					setAlert(null)
					setLockedFor(e.body.retryAfter)
					return
				}
				setAlert(e?.status === 401
					? "That email and password don't match. Check both and try again."
					: failureMessage(e, UNREACHABLE))
				document.getElementById('signin-password')?.focus()
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
				setAlert(deviceFailed(e) ? PASSKEY_FAILED : failureMessage(e, UNREACHABLE))
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
				<span className="sp-divider">or</span>
				<Button variant="outline" size="small" fullWidth disabled={asking} onClick={() => withPasskey(false)}>
					<Icon name="key" size={14} />Sign in with a passkey
				</Button>
			</>
		)
		: null

	// on the Password label's line on a computer; below 640 a full-width button under the field (20a)
	const canReset = mail && !locked

	if (!signedOut) return null
	if (locked) return (
		<AuthCard title="Sign in to Spendly" alertColor="warning" alertIcon="lock" alertTitle="Too many attempts"
			alert={<>Sign in is paused for <b>{waitWords(lockedFor)}</b>.{mail ? ' You can reset your password instead - that works straight away.' : ''}</>}
			onSubmit={submit} submit={mail ? 'Reset my password' : 'Sign in'} disabled={!mail} gap={12}
			note={alert ?? (mail ? `Or wait ${waitWords(lockedFor)} and try again.` : `Wait ${waitWords(lockedFor)} and try again.`)}
			secondary={passkeyButton}>
			<Field label="Email" id="signin-email">
				<TextField type="email" autoComplete="username webauthn" value={email} disabled onChange={() => {}} />
			</Field>
			<Field label="Password" id="signin-password">
				<PasswordField autoComplete="current-password" value={password} disabled onChange={() => {}} />
			</Field>
		</AuthCard>
	)
	return (
		<AuthCard title="Sign in to Spendly" lead={alert ? null : 'Your orders, receipts and monthly limits.'} alert={alert}
			onSubmit={submit} submit="Sign in" busy={busy} busyLabel="Signing in…" secondary={passkeyButton}
			across={alert ? null : <>New here? <Link className="sp-strong au-across" to="/register">Create an account</Link></>}>
			<Field label="Email" id="signin-email" message={emailProblem ?? undefined} messageType={emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="username webauthn" inputMode="email" autoFocus={!given} value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			<Field label="Password" id="signin-password"
				labelAction={canReset && !touch ? <Button variant="outline" size="xsmall" to={resetTo}>Forgot it?</Button> : null}
				message={passwordProblem ?? undefined} messageType={passwordProblem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="current-password" autoFocus={given} value={password}
					onChange={v => { setPassword(v); setPasswordProblem(null) }} />
			</Field>
			{canReset && touch ? <Button variant="outline" fullWidth to={resetTo}>Forgot it?</Button> : null}
			{alert ? null : (
				<Choice control={<Check checked={remember} onChange={ev => setRemember(ev.target.checked)} />}>
					Stay signed in for 30 days
				</Choice>
			)}
		</AuthCard>
	)
}
