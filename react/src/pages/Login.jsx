import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { Field, FieldShell, TextInput, FormActions } from '../components/Form.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { login } from '../api/client.js'

/* Sign-in. Outside the app shell on purpose — the sidebar, the rail and the command palette are
   the signed-in app's chrome, and drawing them around a page nobody is signed in to yet would
   be furniture in an empty room. */

export default function Login() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	const submit = e => {
		e.preventDefault()
		setSaving(true)
		setStatus({ message: '', good: true })
		login(email.trim().toLowerCase(), password)
			.then(() => navigate(params.get('from') || '/', { replace: true }))
			.catch(err => { setSaving(false); setStatus({ message: err.message, good: false }) })
	}

	return (
		<div className="auth-page">
			<Card className="auth-card" aria-label="Sign in">
				<CardBody>
					<div className="auth-heading">
						<span className="brand-mark" aria-hidden="true"><Icon name="receipt" /></span>
						<div>
							<h1>Sign in</h1>
							<p className="auth-tagline">Welcome back — your ledger's just where you left it.</p>
						</div>
					</div>
					<form className="form" onSubmit={submit}>
						<Field label="Email">
							<FieldShell>
								<TextInput id="login-email" type="email" value={email} autoFocus
									onChange={setEmail} aria-label="Email" aria-required="true" />
							</FieldShell>
						</Field>
						<Field label="Password">
							<FieldShell>
								<TextInput id="login-password" type="password" value={password}
									onChange={setPassword} aria-label="Password" aria-required="true" />
							</FieldShell>
						</Field>
						{status.message ? (
							<p role="alert" className={status.good ? 'form-status' : 'form-status form-status-negative'}>
								{status.message}
							</p>
						) : null}
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
