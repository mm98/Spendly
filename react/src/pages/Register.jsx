import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { failureMessage, register } from '../api/client.js'
import { AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, MIN_PASSWORD, PasswordHint, focusField, landing, onward, useMail, useSignedOut } from './SignIn.jsx'

const HINT = `At least ${MIN_PASSWORD} characters. Longer beats complicated.`

export default function Register() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [emailProblem, setEmailProblem] = useState(null)
	const [passwordProblem, setPasswordProblem] = useState(null)
	const [taken, setTaken] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const mail = useMail()
	const signedOut = useSignedOut()

	const checkEmail = () => {
		const ok = !email.trim() || EMAIL_PATTERN.test(email.trim())
		setEmailProblem(ok ? null : EMAIL_PROBLEM)
		return ok
	}

	const submit = () => {
		const emailOk = checkEmail() && EMAIL_PATTERN.test(email.trim())
		if (!emailOk) setEmailProblem(EMAIL_PROBLEM)
		const passwordOk = password.length >= MIN_PASSWORD
		setPasswordProblem(passwordOk ? null : `Use at least ${MIN_PASSWORD} characters.`)
		if (!emailOk || !passwordOk) return focusField(emailOk ? 'register-password' : 'register-email')
		setBusy(true)
		setAlert(null)
		const address = email.trim().toLowerCase()
		register(address, password, name.trim())
			// an address waiting for its link goes to the page that says so (20e); the first run follows
			.then(user => navigate(user?.emailConfirmed === false ? '/confirm' : onward(user, landing(params)), { replace: true }))
			.catch(e => {
				setBusy(false)
				const said = failureMessage(e, '')
				if (e?.status === 409) { setTaken(address); focusField('register-email') }
				else if (e?.status === 400 && /password/i.test(said)) { setPasswordProblem(said); focusField('register-password') }
				else if (e?.status === 400 && said) { setEmailProblem(said); focusField('register-email') }
				else setAlert(failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
			})
	}

	const isTaken = taken !== null && taken === email.trim().toLowerCase()
	const emailMessage = isTaken
		? <>There's already an account with this email. <Link className="sp-strong au-across" to="/signin">Sign in instead?</Link></>
		: emailProblem ?? (mail ? "We'll send a link here to confirm it's yours." : undefined)

	if (!signedOut) return null
	return (
		<AuthCard title="Create your account" lead={isTaken || alert ? null : 'Takes a minute. Nothing to set up afterwards.'}
			alert={alert} onSubmit={submit} submit="Create account" busy={busy} busyLabel="Creating your account…"
			disabled={isTaken}
			across={<>Already have one? <Link className="sp-strong sp-ink-accent au-across" to="/signin">Sign in</Link></>}>
			{isTaken ? null : (
				<Field label="Name" id="register-name">
					<TextField autoComplete="name" value={name} maxLength={80} onChange={setName} />
				</Field>
			)}
			<Field label="Email" id="register-email" message={emailMessage}
				messageType={isTaken || emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			{isTaken ? null : (
				<Field label="Password" id="register-password"
					message={passwordProblem ?? <PasswordHint password={password} hint={HINT} />}
					messageType={passwordProblem ? 'danger' : 'hint'}>
					<PasswordField autoComplete="new-password" value={password}
						onChange={v => { setPassword(v); setPasswordProblem(null) }} />
				</Field>
			)}
		</AuthCard>
	)
}
