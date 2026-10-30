import { useEffect, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { Card, CardFooter, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { Choice, FieldGroup, Switch } from '../components/Choice.jsx'
import { Halves } from '../components/Well.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { changePassword, failureMessage, getSettings, saveStatusEmail, sendTestStatusEmail } from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { MIN_PASSWORD, PasswordHint } from './AuthParts.jsx'
import { landing } from './SettingsParts.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

const DAY = 24 * 60 * 60

/** "today", "3 days ago", "4 months ago": when the password last changed, as a reader counts it. */
const ago = epoch => {
	const days = Math.floor((Date.now() / 1000 - epoch) / DAY)
	if (days < 1) return phrase('time.today')
	if (days < 31) return phrase('time.ago', { time: plural(days, 'day') })
	if (days < 365) return phrase('time.ago', { time: plural(Math.floor(days / 30.44), 'month') })
	return phrase('time.ago', { time: plural(Math.floor(days / 365.25), 'year') })
}

// the smallest picture the server keeps, so a picture too small is said at once rather than at Save
const MIN_PICTURE = 128

/** Whether `file` can be the account's picture: null when it can, else why not. */
async function pictureProblem(file) {
	if (!/^image\/(jpeg|png)$/.test(file.type)) return phrase('account.picture.type')
	try {
		const bitmap = await createImageBitmap(file)
		const small = Math.min(bitmap.width, bitmap.height) < MIN_PICTURE
		bitmap.close()
		return small ? phrase('account.picture.small', { size: MIN_PICTURE }) : null
	} catch {
		return phrase('account.picture.unread')
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

// the status email's switches (11a), either, both or neither
const STATUS_EMAILS = [
	{ key: 'weekly', setting: 'statusEmailWeekly', label: 'statusEmail.weekly', description: 'statusEmail.weeklyHelp' },
	{ key: 'monthly', setting: 'statusEmailMonthly', label: 'statusEmail.monthly', description: 'statusEmail.monthlyHelp' }
]

/** The status email's switches, each saved the moment it is switched. */
function useStatusEmail() {
	const settings = useApi(getSettings)
	const toast = useToast()
	const [chosen, setChosen] = useState(null)
	const value = chosen ?? Object.fromEntries(STATUS_EMAILS.map(s => [s.key, !!settings.data?.[s.setting]]))
	const choose = (key, on) => {
		const next = { ...value, [key]: on }
		setChosen(next)
		saveStatusEmail(next)
			.then(() => invalidate(getSettings))
			.catch(e => {
				setChosen(null)
				const message = failureMessage(e, phrase('statusEmail.notChanged'))
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
			.then(({ email }) => toast({ message: phrase('statusEmail.testSent', { email }) }))
			.catch(() => toast({ message: phrase('statusEmail.testFailed'), color: 'danger' }))
			.finally(() => setSending(false))
	}
	return { sending, send }
}

/** The Status email card (11a), under the account card on a desktop and on its own page on a phone.
    Absent while this server cannot send email, as nothing would arrive. */
export function StatusEmailCard({ user }) {
	const phrase = usePhrase()
	const { ready, value, choose } = useStatusEmail()
	const { sending, send } = useStatusEmailTest()
	if (!user?.mail || !ready) return null
	const button = sending
		? <Button key="test" variant="outline" fullWidth disabled><Spinner />{phrase('links.sending')}</Button>
		: <Button key="test" variant="outline" fullWidth onClick={send}>{phrase('statusEmail.test')}</Button>
	return (
		<Card footerCommits footer={button}>
			<CardHeader name={phrase('settings.statusEmail')} id="status-email-label" />
			<span className="sp-data">
				{phrase('statusEmail.lead', { email: user.email, b: words => <b className="sp-ink sp-break">{words}</b> })}
			</span>
			<FieldGroup aria-labelledby="status-email-label">
				{STATUS_EMAILS.map(s => (
					<Choice key={s.key} variant="described" description={phrase(s.description)}
						control={<Switch checked={value[s.key]} onChange={ev => choose(s.key, ev.target.checked)} />}>
						{phrase(s.label)}
					</Choice>
				))}
			</FieldGroup>
		</Card>
	)
}

/** The account's own card (11a): picture, name, the email it signs in with, and the password. The
    picture applies with the card's Save, like the name (16a): `picture` holds a new file, or null to remove. */
export function AccountCard({ user, value, change, touch }) {
	const phrase = usePhrase()
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
	// initials passed as text would pick their own colour; the account's are always on primary-3 (11a)
	const avatar = shown
		? <Mark size="large" fill="photo" round {...drop}><img src={shown} alt="" /></Mark>
		: shownName
			? <Mark size="large" fill="solid" swatch="primary-3" round {...drop}><>{initialsOf(shownName)}</></Mark>
			: <Mark size="large" fill="empty" round {...drop} />

	const fields = (
		<>
			<Field label={phrase('field.name')} id="account-name">
				<TextField autoComplete="name" value={name} maxLength={80} onChange={v => change('name', v)} />
			</Field>
			{/* read-only, so not a field to type in: the address kept whole on one line (11a) */}
			<div className="sp-field">
				<span className="sp-field__label" id="account-email-label">{phrase('field.email')}</span>
				<div className="sp-input sp-input--readonly" id="account-email" role="textbox" aria-readonly="true" aria-labelledby="account-email-label">
					<EmailLine email={user?.email ?? ''} />
				</div>
			</div>
		</>
	)

	return (
		<Card>
			<CardHeader name={phrase('settings.section.account')} {...landing('account')} />
			<div className="sp-row-flex sp-gap-16">
				{avatar}
				<div className="sp-stack sp-gap-6">
					<div className="sp-row-flex sp-gap-8">
						<input ref={input} id="account-picture" type="file" accept="image/jpeg,image/png" hidden
							onChange={ev => choose(ev.target.files?.[0])} />
						<Button variant="outline" size="small" onClick={() => input.current?.click()}>{phrase('account.upload')}</Button>
						{shown ? <Button variant="outline" size="small" onClick={remove}>{phrase('action.remove')}</Button> : null}
					</div>
					<span className={problem ? 'sp-meta sp-ink-danger' : 'sp-meta'} role={problem ? 'alert' : undefined}>
						{problem ?? phrase('account.picture.hint', { size: MIN_PICTURE })}
					</span>
				</div>
			</div>
			{touch ? fields : <Halves>{fields}</Halves>}
			<CardFooter>
				<span className="sp-data">
					{user?.passwordChangedAt ? phrase('account.passwordChanged', { when: ago(user.passwordChangedAt) }) : phrase('account.passwordNever')}
				</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={() => setAsking(true)}>{phrase('account.changePassword')}</Button>
			</CardFooter>
			<Leaving>{asking ? <PasswordDialog onClose={() => setAsking(false)} onSaved={() => { setAsking(false); toast({ message: phrase('account.passwordSaved') }) }} /> : null}</Leaving>
		</Card>
	)
}

/** Change password (Actions inventory, Input types 14a): the current one, then the new one with its
    meter. No second copy to type: the reveal does that job. Every other session is signed out. */
function PasswordDialog({ onClose, onSaved }) {
	const phrase = usePhrase()
	const [current, setCurrent] = useState('')
	const [next, setNext] = useState('')
	const [problems, setProblems] = useState({})
	const [alert, setAlert] = useState(null)
	const [busy, setBusy] = useState(false)
	const save = () => {
		const found = {}
		if (!current) found.current = phrase('account.currentMissing')
		if (next.length < MIN_PASSWORD) found.password = phrase('auth.passwordTooShort', { count: MIN_PASSWORD })
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
				} else setAlert(failureMessage(e, phrase('account.passwordNotSaved')))
			})
	}
	return (
		<Dialog onCancel={busy ? undefined : onClose}>
			<DialogTitle>{phrase('account.changePassword')}</DialogTitle>
			<DialogBody>{phrase('account.passwordDialog')}</DialogBody>
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy) save() }}>
				<Field label={phrase('field.currentPassword')} id="password-current" message={problems.current} messageType={problems.current ? 'danger' : 'hint'}>
					<PasswordField autoComplete="current-password" autoFocus value={current}
						onChange={v => { setCurrent(v); setProblems(p => ({ ...p, current: undefined })) }} />
				</Field>
				<Field label={phrase('field.newPassword')} id="password-new"
					message={problems.password ?? <PasswordHint password={next} hint={phrase('register.passwordHint', { count: MIN_PASSWORD })} />}
					messageType={problems.password ? 'danger' : 'hint'}>
					<PasswordField autoComplete="new-password" value={next}
						onChange={v => { setNext(v); setProblems(p => ({ ...p, password: undefined })) }} />
				</Field>
				{alert ? <span className="sp-meta sp-ink-danger" role="alert">{alert}</span> : null}
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={onClose}>{phrase('action.cancel')}</Button>
				<Button disabled={busy} onClick={save}>{phrase(busy ? 'action.saving' : 'account.changePassword')}</Button>
			</DialogActions>
		</Dialog>
	)
}
