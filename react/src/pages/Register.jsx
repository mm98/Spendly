import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { failureMessage, register } from '../api/client.js'
import { useShellShape } from '../app/useMedia.js'
import { AuthCard, EMAIL_PATTERN, EMAIL_PROBLEM, MIN_PASSWORD, PasswordHint, useFocusField, landing, onward, useAuthOptions, useSignedOut } from './AuthParts.jsx'
import { usePhrase } from '../language/phrases.js'

// a new tab, so what is typed here is still here after reading; the operator's own page when set
function NoticeLink({ to, page, children }) {
	return <a className="sp-strong" href={to ?? '#' + page} target="_blank" rel="noopener noreferrer">{children}</a>
}

export default function Register() {
	const phrase = usePhrase()
	const focusField = useFocusField()
	const touch = useShellShape() === 'touch'
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
	const options = useAuthOptions()
	const mail = Boolean(options?.mail)
	const signedOut = useSignedOut()

	const checkEmail = () => {
		const ok = !email.trim() || EMAIL_PATTERN.test(email.trim())
		setEmailProblem(ok ? null : phrase(EMAIL_PROBLEM))
		return ok
	}

	const submit = () => {
		const emailOk = checkEmail() && EMAIL_PATTERN.test(email.trim())
		if (!emailOk) setEmailProblem(phrase(EMAIL_PROBLEM))
		const passwordOk = password.length >= MIN_PASSWORD
		setPasswordProblem(passwordOk ? null : phrase('auth.passwordTooShort', { count: MIN_PASSWORD }))
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
				else setAlert(failureMessage(e, phrase('failed.unreachable')))
			})
	}

	const isTaken = taken !== null && taken === email.trim().toLowerCase()
	const emailMessage = isTaken
		? phrase('register.taken', { signIn: words => <Link className="sp-strong au-across" to="/signin">{words}</Link> })
		: emailProblem ?? (mail ? phrase('register.emailHint') : undefined)

	if (!signedOut) return null
	return (
		<AuthCard title={phrase('page.createYourAccount')} lead={isTaken || alert ? null : phrase('register.lead')}
			alert={alert} onSubmit={submit} submit={phrase('register.submit')} busy={busy} busyLabel={phrase('register.busy')}
			disabled={isTaken}
			terms={isTaken ? null : phrase('register.terms', {
				terms: words => <NoticeLink to={options?.terms} page="/terms">{words}</NoticeLink>,
				privacy: words => <NoticeLink to={options?.privacy} page="/privacy">{words}</NoticeLink>
			})}
			across={isTaken ? null : phrase('register.haveOne', { signIn: words => <Link className="sp-strong au-across" to="/signin">{words}</Link> })}>
			{isTaken ? null : (
				<Field label={phrase('field.name')} id="register-name">
					<TextField autoComplete="name" value={name} maxLength={80} onChange={setName} />
				</Field>
			)}
			<Field label={phrase('field.email')} id="register-email" message={emailMessage}
				messageType={isTaken || emailProblem ? 'danger' : 'hint'}>
				<TextField type="email" autoComplete="email" inputMode="email" autoFocus={!touch} value={email}
					onChange={v => { setEmail(v); setEmailProblem(null) }} onBlur={checkEmail} />
			</Field>
			{isTaken ? null : (
				<Field label={phrase('field.password')} id="register-password"
					message={passwordProblem ?? <PasswordHint password={password} hint={phrase('register.passwordHint', { count: MIN_PASSWORD })} />}
					messageType={passwordProblem ? 'danger' : 'hint'}>
					<PasswordField autoComplete="new-password" value={password}
						onChange={v => { setPassword(v); setPasswordProblem(null) }} />
				</Field>
			)}
		</AuthCard>
	)
}
