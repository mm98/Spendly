import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { Field, FieldShell, TextInput, FormActions } from '../components/Form.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { failureMessage, register } from '../api/client.js'

/** Sign-up. A new account starts genuinely empty -- no vendor, no category, no order until
    the person who owns it adds one. It used to seed a demo dataset so a fresh account opened
    on a populated app; that read as someone else's real orders staring back at a new user,
    which is the one impression a personal-finance app can least afford to give. See
    api/src/seed.js. */
export default function Register() {
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [status, setStatus] = useState({ message: '', good: true })
	const [saving, setSaving] = useState(false)

	const submit = e => {
		e.preventDefault()
		if (password.length < 8) {
			setStatus({ message: 'Password must be at least 8 characters.', good: false })
			return
		}
		setSaving(true)
		setStatus({ message: '', good: true })
		register(email.trim().toLowerCase(), password)
			.then(() => navigate('/', { replace: true }))
			.catch(err => { setSaving(false)
				setStatus({ message: failureMessage(err, 'Could not create the account. Try again.'), good: false }) })
	}

	return (
		<div className="auth-page">
			<Card className="auth-card" aria-label="Create an account">
				<CardBody>
					<div className="auth-heading">
						<span className="brand-mark" aria-hidden="true"><Icon name="receipt" /></span>
						<div>
							<h1>Create an account</h1>
							<p className="auth-tagline">Every receipt, order and saving in one place.</p>
						</div>
					</div>
					<form className="form" onSubmit={submit}>
						<Field label="Email" htmlFor="register-email">
							<FieldShell>
								<TextInput id="register-email" type="email" value={email} autoFocus
									onChange={setEmail} aria-label="Email" aria-required="true" />
							</FieldShell>
						</Field>
						<Field label="Password" htmlFor="register-password" help="At least 8 characters.">
							<FieldShell>
								<TextInput id="register-password" type="password" value={password}
									onChange={setPassword} aria-label="Password" aria-required="true" />
							</FieldShell>
						</Field>
						{status.message ? (
							<p role="alert" className={status.good ? 'form-status' : 'form-status form-status-negative'}>
								{status.message}
							</p>
						) : null}
						<FormActions>
							<Button variant="primary" type="submit" disabled={saving}>{saving ? 'CREATING...' : 'CREATE ACCOUNT'}</Button>
						</FormActions>
					</form>
					<p className="field-help auth-switch">
						Already have an account? <Link to="/login">Sign in</Link>.
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
