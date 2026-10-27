import { useEffect, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { changePassword, failureMessage, getSettings, saveStatusEmail, sendTestStatusEmail } from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { MIN_PASSWORD, PasswordHint } from './AuthParts.jsx'
import { SettingRow, SettingRows, useSettingsHead, landing } from './SettingsParts.jsx'

const DAY = 24 * 60 * 60

/** "today", "3 days ago", "4 months ago": when the password last changed, as a reader counts it. */
const ago = epoch => {
	const days = Math.floor((Date.now() / 1000 - epoch) / DAY)
	if (days < 1) return 'today'
	if (days < 31) return `${plural(days, 'day')} ago`
	if (days < 365) return `${plural(Math.floor(days / 30.44), 'month')} ago`
	return `${plural(Math.floor(days / 365.25), 'year')} ago`
}

// the smallest picture the server keeps, so a picture too small is said at once rather than at Save
const MIN_PICTURE = 128

/** Whether `file` can be the account's picture: null when it can, else why not. */
async function pictureProblem(file) {
	if (!/^image\/(jpeg|png)$/.test(file.type)) return 'That file is not a JPG or PNG picture.'
	try {
		const bitmap = await createImageBitmap(file)
		const small = Math.min(bitmap.width, bitmap.height) < MIN_PICTURE
		bitmap.close()
		return small ? `That picture is too small. It must be at least ${MIN_PICTURE} by ${MIN_PICTURE}.` : null
	} catch {
		return 'That picture could not be read. Choose a JPG or PNG.'
	}
}

/** The address a picture chosen but not yet saved is drawn from, let go when it is replaced. */
function usePreview(file) {
	const [url, setUrl] = useState(null)
	useEffect(() => {
		if (!(file instanceof Blob)) { setUrl(null); return }
		const made = URL.createObjectURL(file)
		setUrl(made)
		return () => URL.revokeObjectURL(made)
	}, [file])
	return url
}

const STATUS_EMAILS = [{ value: 'none', label: 'None' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]

/** The status email's setting, saved the moment it is chosen. */
function useStatusEmail() {
	const settings = useApi(getSettings)
	const toast = useToast()
	const [chosen, setChosen] = useState(null)
	const value = chosen ?? settings.data?.statusEmail ?? 'none'
	const choose = next => {
		setChosen(next)
		saveStatusEmail(next)
			.then(() => invalidate(getSettings))
			.catch(e => {
				setChosen(null)
				const message = failureMessage(e, 'Your status email was not changed. Try again.')
				if (message) toast({ message, color: 'danger' })
			})
	}
	return { ready: !!settings.data, value, choose }
}

/** Send a test email (11a): `sending` while it goes, then a toast either way. */
function useStatusEmailTest() {
	const toast = useToast()
	const [sending, setSending] = useState(false)
	const send = () => {
		setSending(true)
		sendTestStatusEmail()
			.then(({ email }) => toast({ message: `Test sent to ${email}` }))
			.catch(() => toast({ message: 'The test could not be sent. Try again.', color: 'danger' }))
			.finally(() => setSending(false))
	}
	return { sending, send }
}

/** The Status email card (25d), in Notifications. Absent while this server cannot send email, as
    nothing would arrive. The choice and the test act at once, so the save bar is never involved. */
export function StatusEmailCard({ user }) {
	const { named, back } = useSettingsHead('status-email')
	const { ready, value, choose } = useStatusEmail()
	const { sending, send } = useStatusEmailTest()
	if (!user?.mail || !ready) return null
	return (
		<Card>
			<CardHeader name={named('Status email')} {...landing('status-email')} actions={back} />
			<SettingRows>
				<SettingRow label="How often"
					help="What you spent and saved, limits passed, your latest orders and bookmarks. Weekly arrives on Monday, Monthly on the 1st.">
					<Segmented name="status-email" fullWidth options={STATUS_EMAILS} value={value} onChange={choose}
						role="radiogroup" aria-label="How often" />
				</SettingRow>
				<SettingRow label="Send a test email" help="Sends the last period's email to your address now.">
					<span className="sp-row-flex">
						{sending
							? <Button variant="outline" size="small" disabled><Spinner />Sending…</Button>
							: <Button variant="outline" size="small" onClick={send}>Send a test email</Button>}
					</span>
				</SettingRow>
			</SettingRows>
		</Card>
	)
}

/** The account's own card (25a): picture, name, the email it signs in with, and the password. The
    picture applies with the save bar, like the name (16a): `picture` holds a new file, or null to remove. */
export function AccountCard({ user, value, change }) {
	const { named, back } = useSettingsHead('account')
	const toast = useToast()
	const input = useRef(null)
	const [problem, setProblem] = useState(null)
	const [asking, setAsking] = useState(false)
	const name = value('name') ?? ''
	const picture = value('picture') ?? null
	const preview = usePreview(picture)
	const shown = picture instanceof Blob ? preview : picture

	const choose = async file => {
		if (input.current) input.current.value = ''
		if (!file) return
		const why = await pictureProblem(file)
		setProblem(why)
		if (!why) change('picture', file)
	}
	const remove = () => {
		setProblem(null)
		change('picture', null)
	}

	const shownName = name.trim() || user?.email?.split('@')[0] || ''
	const drop = { as: 'label', htmlFor: 'account-picture', onDragOver: ev => ev.preventDefault(), onDrop: ev => { ev.preventDefault(); choose(ev.dataTransfer?.files?.[0]) } }
	// initials passed as text would pick their own colour; the account's are always on green-3 (11a)
	const avatar = shown
		? <Mark size="large" fill="photo" round {...drop}><img src={shown} alt="" /></Mark>
		: shownName
			? <Mark size="large" fill="solid" swatch="green-3" round {...drop}><>{initialsOf(shownName)}</></Mark>
			: <Mark size="large" fill="empty" round {...drop} />

	return (
		<Card>
			<CardHeader name={named('Profile')} {...landing('account')} actions={back} />
			<SettingRows>
				<SettingRow label="Photo" help={problem ?? 'JPG or PNG, at least 128×128.'} helpDanger={problem != null}>
					<span className="sp-row-flex sp-gap-12">
						{avatar}
						<input ref={input} id="account-picture" type="file" accept="image/jpeg,image/png" hidden
							onChange={ev => choose(ev.target.files?.[0])} />
						<Button variant="outline" size="small" onClick={() => input.current?.click()}>Upload a photo</Button>
						{shown ? <Button variant="outline" size="small" onClick={remove}>Remove</Button> : null}
					</span>
				</SettingRow>
				<SettingRow label="Name" htmlFor="account-name">
					<TextField id="account-name" autoComplete="name" value={name} maxLength={80} onChange={v => change('name', v)} />
				</SettingRow>
				{/* read-only, so not a field to type in: the address kept whole on one line (11a) */}
				<SettingRow label="Email" help="Where sign-in links and the status email go.">
					<div className="sp-input sp-input--readonly" id="account-email" role="textbox" aria-readonly="true" aria-label="Email">
						<EmailLine email={user?.email ?? ''} />
					</div>
				</SettingRow>
				<SettingRow label="Password"
					help={user?.passwordChangedAt ? `Last changed ${ago(user.passwordChangedAt)}.` : 'Not changed here yet.'}>
					<span className="sp-row-flex">
						<Button variant="outline" size="small" onClick={() => setAsking(true)}>Change password</Button>
					</span>
				</SettingRow>
			</SettingRows>
			<Leaving>{asking ? <PasswordDialog onClose={() => setAsking(false)} onSaved={() => { setAsking(false); toast({ message: 'Your password is changed.' }) }} /> : null}</Leaving>
		</Card>
	)
}

/** Change password (Actions inventory, Input types 14a): the current one, then the new one with its
    meter. No second copy to type: the reveal does that job. Every other session is signed out. */
function PasswordDialog({ onClose, onSaved }) {
	const [current, setCurrent] = useState('')
	const [next, setNext] = useState('')
	const [problems, setProblems] = useState({})
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const save = () => {
		const found = {}
		if (!current) found.current = 'Enter your current password.'
		if (next.length < MIN_PASSWORD) found.password = `Use at least ${MIN_PASSWORD} characters.`
		setProblems(found)
		if (Object.keys(found).length) return document.getElementById(found.current ? 'password-current' : 'password-new')?.focus()
		setBusy(true)
		setAlert(null)
		changePassword(current, next)
			.then(onSaved)
			.catch(e => {
				setBusy(false)
				if (e?.fields) {
					setProblems(e.fields)
					document.getElementById(e.fields.current ? 'password-current' : 'password-new')?.focus()
				} else setAlert(failureMessage(e, 'Your password was not changed. Try again.'))
			})
	}
	return (
		<Dialog onCancel={busy ? undefined : onClose}>
			<DialogTitle>Change password</DialogTitle>
			<DialogBody>Your other devices are signed out. This one stays signed in.</DialogBody>
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy) save() }}>
				<Field label="Current password" id="password-current" message={problems.current} messageType={problems.current ? 'danger' : 'hint'}>
					<PasswordField autoComplete="current-password" autoFocus value={current}
						onChange={v => { setCurrent(v); setProblems(p => ({ ...p, current: undefined })) }} />
				</Field>
				<Field label="New password" id="password-new"
					message={problems.password ?? <PasswordHint password={next} hint={`At least ${MIN_PASSWORD} characters. Longer beats complicated.`} />}
					messageType={problems.password ? 'danger' : 'hint'}>
					<PasswordField autoComplete="new-password" value={next}
						onChange={v => { setNext(v); setProblems(p => ({ ...p, password: undefined })) }} />
				</Field>
				{alert ? <span className="sp-meta sp-ink-danger" role="alert">{alert}</span> : null}
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
				<Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Change password'}</Button>
			</DialogActions>
		</Dialog>
	)
}
