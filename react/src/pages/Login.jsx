import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { Field, FieldShell, TextInput, FormActions, focusField } from '../components/Form.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { failureMessage, login } from '../api/client.js'

/* Sign-in. Outside the app shell on purpose — the sidebar, the rail and the command palette are
   the signed-in app's chrome, and drawing them around a page nobody is signed in to yet would
   be furniture in an empty room. */

export default function Login() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [saving, setSaving] = useState(false)

	const submit = e => {
		e.preventDefault()
		setSaving(true)
		setError('')
		/* An account that has never been shown the settings page is sent there once, the same
		   detour registration takes -- this is the branch that catches someone who registered
		   and closed the tab before it landed. A `from` in the query wins: that is a reader who
		   was interrupted on their way somewhere specific, and a welcome that eats the page
		   they asked for is worse than a welcome they never got. */
		login(email.trim().toLowerCase(), password)
			.then(user => {
				const asked = params.get('from')
				if (!asked && user?.needsSetup) navigate('/settings', { replace: true, state: { firstRun: true } })
				else navigate(asked || '/', { replace: true })
			})
			.catch(err => { setSaving(false)
				setError(failureMessage(err, 'Could not sign in. Try again.'))
				focusField('login-password') })
	}

	return (
		<div className="auth-page">
			<Card className="auth-card" aria-label="Sign in">
				<CardBody>
					<div className="auth-heading">
						<span className="brand-mark" aria-hidden="true"><Icon name="receipt" /></span>
						<div>
							<h1>Sign in</h1>
							<p className="auth-tagline">Welcome back. Your ledger's just where you left it.</p>
						</div>
					</div>
					<form className="form" onSubmit={submit}>
						<Field label="Email" htmlFor="login-email">
							<FieldShell>
								<TextInput id="login-email" type="email" value={email} autoFocus
									onChange={v => { setEmail(v); setError('') }}
									aria-label="Email" aria-required="true" />
							</FieldShell>
						</Field>
						<Field label="Password" htmlFor="login-password"
							error={error} errorId="login-password-error">
							<FieldShell>
								<TextInput id="login-password" type="password" value={password}
									onChange={v => { setPassword(v); setError('') }}
									aria-label="Password" aria-required="true"
									invalid={Boolean(error)} describedBy="login-password-error" />
							</FieldShell>
						</Field>
						<FormActions>
							<Button variant="primary" type="submit" disabled={saving}>{saving ? 'SIGNING IN...' : 'SIGN IN'}</Button>
						</FormActions>
					</form>
					<p className="field-help auth-switch">
						No account yet? <Link to="/register">Create one</Link>.
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
