import { useRef, useState } from 'react'
import { Card, CardFooter } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Mark } from '../components/Mark.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Halves } from '../components/Well.jsx'
import { changePassword, failureMessage, removePicture, uploadPicture } from '../api/client.js'
import { plural } from '../api/format.js'
import { MIN_PASSWORD, PasswordHint } from './SignIn.jsx'
import { Heading } from './SettingsParts.jsx'

const DAY = 24 * 60 * 60

/** "today", "3 days ago", "4 months ago": when the password last changed, as a reader counts it. */
const ago = epoch => {
	const days = Math.floor((Date.now() / 1000 - epoch) / DAY)
	if (days < 1) return 'today'
	if (days < 31) return `${plural(days, 'day')} ago`
	if (days < 365) return `${plural(Math.floor(days / 30.44), 'month')} ago`
	return `${plural(Math.floor(days / 365.25), 'year')} ago`
}

/** The account's own card (11a): picture, name, the email it signs in with, and the password. */
export function AccountCard({ user, value, change, touch }) {
	const toast = useToast()
	const input = useRef(null)
	const [busy, setBusy] = useState(false)
	const [problem, setProblem] = useState(null)
	const [asking, setAsking] = useState(false)
	const name = value('name') ?? ''

	const upload = file => {
		if (!file) return
		setBusy(true)
		setProblem(null)
		uploadPicture(file)
			.then(() => toast({ message: 'Your picture is saved.' }))
			.catch(e => setProblem(failureMessage(e, 'The picture was not saved. Try again.')))
			.finally(() => { setBusy(false); if (input.current) input.current.value = '' })
	}
	const remove = () => {
		setBusy(true)
		setProblem(null)
		removePicture()
			.then(() => toast({ message: 'Your picture is removed.' }))
			.catch(e => setProblem(failureMessage(e, 'The picture was not removed. Try again.')))
			.finally(() => setBusy(false))
	}

	const shownName = name.trim() || user?.email?.split('@')[0] || ''
	const avatar = user?.picture
		? <Mark size="large" fill="photo" round aria-label="Your picture"><img src={user.picture} alt="" /></Mark>
		: shownName ? <Mark size="large" fill="solid" round>{shownName}</Mark> : <Mark size="large" fill="empty" round aria-label="No picture" />

	const fields = (
		<>
			<Field label="Name" id="account-name">
				<TextField autoComplete="name" value={name} maxLength={80} onChange={v => change('name', v)} />
			</Field>
			<Field label="Email" id="account-email">
				<TextField type="email" variant="readonly" readOnly value={user?.email ?? ''} />
			</Field>
		</>
	)

	return (
		<Card>
			<Heading section="account">Account and profile</Heading>
			<div className="sp-row-flex sp-gap-16">
				{avatar}
				<div className="sp-stack sp-gap-6">
					<div className="sp-row-flex sp-gap-8">
						<input ref={input} id="account-picture" type="file" accept="image/jpeg,image/png" hidden
							onChange={ev => upload(ev.target.files?.[0])} />
						<Button variant="outline" size="small" disabled={busy} onClick={() => input.current?.click()}>Upload a photo</Button>
						{user?.picture ? <Button variant="outline" size="small" disabled={busy} onClick={remove}>Remove</Button> : null}
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
