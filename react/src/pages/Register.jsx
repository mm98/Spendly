import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { Field, FieldShell, TextInput, FormActions } from '../components/Form.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { register } from '../api/client.js'

/** Sign-up. Seeds the same demo dataset the app has always shipped with (api/src/seed.js), so a
    fresh account opens on a populated app rather than an empty one. */
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
			.catch(err => { setSaving(false); setStatus({ message: err.message, good: false }) })
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
						<Field label="Email">
							<FieldShell>
								<TextInput id="register-email" type="email" value={email} autoFocus
									onChange={setEmail} aria-label="Email" aria-required="true" />
							</FieldShell>
						</Field>
						<Field label="Password" help="At least 8 characters.">
							<FieldShell>
								<TextInput id="register-password" type="password" value={password}
									onChange={setPassword} aria-label="Password" aria-required="true" />
							</FieldShell>
						</Field>
						{status.message ? (
							<p role="alert" style={{ color: status.good ? 'var(--green)' : 'var(--red, #C0392B)', fontSize: 13.5 }}>
								{status.message}
							</p>
						) : null}
						<FormActions>
							<Button variant="primary" type="submit" disabled={saving}>{saving ? 'CREATING…' : 'CREATE ACCOUNT'}</Button>
						</FormActions>
					</form>
					<p className="field-help" style={{ marginTop: 14 }}>
						Already have an account? <Link to="/login">Sign in</Link>.
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
