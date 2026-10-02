import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { failureMessage, register } from '../api/client.js'
import { AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, landing } from './SignIn.jsx'

// the server refuses anything shorter
const MIN_PASSWORD = 8

export default function Register() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [emailProblem, setEmailProblem] = useState(null)
	const [passwordProblem, setPasswordProblem] = useState(null)
	const [taken, setTaken] = useState(null)
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)

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
		if (!emailOk || !passwordOk) return
		setBusy(true)
		setAlert(null)
		const address = email.trim().toLowerCase()
		register(address, password)
			.then(() => navigate(landing(params), { replace: true }))
			.catch(e => {
				setBusy(false)
				if (e?.status === 409) setTaken(address)
				else if (e?.status === 400 && /password/i.test(e.message)) setPasswordProblem(e.message)
				else if (e?.status === 400) setEmailProblem(e.message)
				else setAlert(failureMessage(e, 'Spendly could not be reached. Check your connection and try again.'))
			})
	}

	const isTaken = taken !== null && taken === email.trim().toLowerCase()
	const emailMessage = isTaken
		? <>There's already an account with this email. <Link className="sp-strong" to="/signin">Sign in instead?</Link></>
		: emailProblem

	return (
		<AuthCard title="Create your account" lead={isTaken || alert ? null : 'Takes a minute. Nothing to set up afterwards.'}
			alert={alert} onSubmit={submit} submit="Create account" busy={busy} busyLabel="Creating your account…"
			disabled={isTaken}
			across={<>Already have one? <Link className="sp-strong sp-ink-accent" to="/signin">Sign in</Link></>}>
			<Field label="Email" message={emailMessage ?? undefined} messageType={emailMessage ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			<Field label="Password" message={passwordProblem ?? 'At least 8 characters. Longer beats complicated.'}
				messageType={passwordProblem ? 'danger' : 'hint'}>
				<PasswordField autoComplete="new-password" value={password}
					onChange={v => { setPassword(v); setPasswordProblem(null) }} />
			</Field>
		</AuthCard>
	)
}
