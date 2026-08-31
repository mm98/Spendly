import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Card, CardBody } from '../components/Card.jsx'
import { Field, FieldShell, TextInput, FormActions, focusField } from '../components/Form.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { failureMessage, register } from '../api/client.js'

/** Sign-up. A new account starts genuinely empty -- no vendor, no category, no order until
    the person who owns it adds one: seeded demo data would read as someone else's real orders
    staring back at a new user, which is the one impression a personal-finance app can least
    afford to give. See api/src/seed.js. */
export default function Register() {
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [saving, setSaving] = useState(false)

	const submit = e => {
		e.preventDefault()
		if (password.length < 8) {
			setError('Password must be at least 8 characters.')
			focusField('register-password')
			return
		}
		setSaving(true)
		setError('')
		/* Straight to the settings page, once, rather than to Home. A new account's ledger is
		   empty, so Home has nothing to show it; the preferences do, and the date format among
		   them has just been guessed from the browser's timezone and wants confirming by the
		   only person who knows. `firstRun` is what tells the page it is being visited for that
		   reason -- it draws a line saying so and records that the detour has happened. */
		register(email.trim().toLowerCase(), password)
			.then(() => navigate('/settings', { replace: true, state: { firstRun: true } }))
			.catch(err => { setSaving(false)
				setError(failureMessage(err, 'Could not create the account. Try again.'))
				focusField('register-password') })
	}

	return (
		<main className="auth-page">
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
									onChange={v => { setEmail(v); setError('') }}
									aria-label="Email" aria-required="true" />
							</FieldShell>
						</Field>
						<Field label="Password" htmlFor="register-password" help="At least 8 characters."
							error={error} errorId="register-password-error">
							<FieldShell>
								<TextInput id="register-password" type="password" value={password}
									onChange={v => { setPassword(v); setError('') }}
									aria-label="Password" aria-required="true"
									invalid={Boolean(error)} describedBy="register-password-error" />
							</FieldShell>
						</Field>
						<FormActions>
							<Button variant="primary" type="submit" disabled={saving}>{saving ? 'CREATING...' : 'CREATE ACCOUNT'}</Button>
						</FormActions>
					</form>
					<p className="field-help auth-switch">
						Already have an account? <Link to="/login">Sign in</Link>.
					</p>
				</CardBody>
			</Card>
		</main>
	)
}
