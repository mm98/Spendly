import { useEffect, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { Card, CardFooter, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Halves } from '../components/Well.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { changePassword, failureMessage, getSettings, saveStatusEmail, sendTestStatusEmail } from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { MIN_PASSWORD, PasswordHint } from './AuthParts.jsx'
import { landing } from './SettingsParts.jsx'

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

/** The Status email card (11a), under the account card on a desktop. Absent while this server cannot
    send email, as nothing would arrive. */
export function StatusEmailCard({ user }) {
	const { ready, value, choose } = useStatusEmail()
	const { sending, send } = useStatusEmailTest()
	if (!user?.mail || !ready) return null
	const button = sending
		? <Button key="test" variant="outline" fullWidth disabled><Spinner />Sending…</Button>
		: <Button key="test" variant="outline" fullWidth onClick={send}>Send a test email</Button>
	return (
		<Card footerCommits footer={button}>
			<CardHeader name="Status email" id="status-email-label" />
			<span className="sp-data">
				What you spent and saved, limits passed, your latest orders and bookmarks, sent to <b className="sp-ink sp-break">{user.email}</b>. Weekly arrives on Monday, Monthly on the 1st.
			</span>
			<Segmented name="status-email" variant="fill" options={STATUS_EMAILS} value={value} onChange={choose}
				role="radiogroup" aria-labelledby="status-email-label" />
		</Card>
	)
}

/** The status email in the phone's Settings list (7a): the switch in its row, then Send a test email. */
export function StatusEmailRows({ user }) {
	const { ready, value, choose } = useStatusEmail()
	const { sending, send } = useStatusEmailTest()
	if (!user?.mail || !ready) return null
	return (
		<>
			<ListItem variant="card" setting>
				<span className="sp-field__label sp-grow" id="status-email-row-label">Status email</span>
				<Segmented name="status-email-row" options={STATUS_EMAILS} value={value} onChange={choose}
					role="radiogroup" aria-labelledby="status-email-row-label" />
			</ListItem>
			<ListItem variant="card" onClick={send} disabled={sending}>
				<span className="sp-data sp-grow">{sending ? 'Sending…' : 'Send a test email'}</span>
				{sending ? <Spinner /> : null}
			</ListItem>
		</>
	)
}

/** The account's own card (11a): picture, name, the email it signs in with, and the password. The
    picture applies with the card's Save, like the name (16a): `picture` holds a new file, or null to remove. */
export function AccountCard({ user, value, change, touch }) {
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
		? <Mark size="large" fill="photo" round aria-label="Your picture" {...drop}><img src={shown} alt="" /></Mark>
		: shownName
			? <Mark size="large" fill="solid" swatch="green-3" round role="img" aria-label={shownName} {...drop}><>{initialsOf(shownName)}</></Mark>
			: <Mark size="large" fill="empty" round aria-label="No picture" {...drop} />

	const fields = (
		<>
			<Field label="Name" id="account-name">
				<TextField autoComplete="name" value={name} maxLength={80} onChange={v => change('name', v)} />
			</Field>
			{/* read-only, so not a field to type in: the address kept whole on one line (11a) */}
			<div className="sp-field">
				<span className="sp-field__label" id="account-email-label">Email</span>
				<div className="sp-input sp-input--readonly" id="account-email" role="textbox" aria-readonly="true" aria-labelledby="account-email-label">
					<EmailLine email={user?.email ?? ''} />
				</div>
			</div>
		</>
	)

	return (
		<Card>
			<CardHeader name="Account and profile" {...landing('account')} />
			<div className="sp-row-flex sp-gap-16">
				{avatar}
				<div className="sp-stack sp-gap-6">
					<div className="sp-row-flex sp-gap-8">
						<input ref={input} id="account-picture" type="file" accept="image/jpeg,image/png" hidden
							onChange={ev => choose(ev.target.files?.[0])} />
						<Button variant="outline" size="small" onClick={() => input.current?.click()}>Upload a photo</Button>
						{shown ? <Button variant="outline" size="small" onClick={remove}>Remove</Button> : null}
					</div>
					<span className={problem ? 'sp-meta sp-ink-danger' : 'sp-meta'} role={problem ? 'alert' : undefined}>
						{problem ?? 'JPG or PNG, at least 128×128.'}
					</span>
				</div>
			</div>
			{touch ? fields : <Halves>{fields}</Halves>}
			<CardFooter>
				<span className="sp-data">
					{user?.passwordChangedAt ? `Password last changed ${ago(user.passwordChangedAt)}.` : 'Your password has not been changed here.'}
				</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={() => setAsking(true)}>Change password</Button>
			</CardFooter>
			{asking ? <PasswordDialog onClose={() => setAsking(false)} onSaved={() => { setAsking(false); toast({ message: 'Your password is changed.' }) }} /> : null}
		</Card>
	)
}

/** Change password (Actions inventory, Input types 14a): the current one, then the new one with its
    meter. No second copy to type: the reveal does that job. Other sessions stay signed in. */
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
			<DialogBody>Other devices where you are signed in stay signed in.</DialogBody>
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
