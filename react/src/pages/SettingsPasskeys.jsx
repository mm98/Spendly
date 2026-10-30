import { Fragment, useEffect, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, Leaving } from '../components/Overlays.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { failureMessage, getPasskeys, removePasskey, renamePasskey } from '../api/client.js'
import { dayShortMonthYear, dot, isToday } from '../api/format.js'
import { useApi } from '../api/useApi.js'
import { addPasskeyHere, alreadyHere, closedPrompt, deviceFailed, passkeysHere } from '../app/passkeys.js'
import { useAuthOptions } from './AuthParts.jsx'
import { landing } from './SettingsParts.jsx'
import { phrase, usePhrase } from '../language/phrases.js'

const used = seconds => (seconds == null ? phrase('passkey.notUsed') : phrase('passkey.lastUsed', { when: isToday(seconds) ? phrase('time.today') : dayShortMonthYear(seconds) }))

/* Passkeys, a card under Account and profile (11a) and a page of its own on a phone (7a). The
   password always keeps working, so removing the last passkey locks nobody out. */
export function PasskeysCard() {
	const phrase = usePhrase()
	const options = useAuthOptions()
	const list = useApi(getPasskeys)
	const [adding, setAdding] = useState(false)
	const [problem, setProblem] = useState(null)
	const [renaming, setRenaming] = useState(null)
	const [removing, setRemoving] = useState(null)
	// the server has no address for passkeys, so there is nothing to show
	if (!options?.passkeys) return null
	const here = passkeysHere(options)
	const add = () => {
		setAdding(true)
		setProblem(null)
	}
	// the device's own refusal shows on the card; a wrong password stays in the dialog
	const deviceRefused = e => {
		setAdding(false)
		if (closedPrompt(e)) return
		setProblem(phrase(alreadyHere(e) ? 'passkey.alreadyHere' : 'passkey.notAdded'))
	}
	const rows = list.data?.passkeys
	return (
		<Card>
			<CardHeader name={phrase('settings.passkeys')} {...landing('passkeys')} control={here
				? <Button variant="outline" size="small" disabled={adding} onClick={add}><Icon name="key" size={14} />{phrase('passkey.add')}</Button>
				: null} />
			<span className="sp-data">{phrase('passkey.lead')}</span>
			{here ? null : (
				<span className="sp-meta">
					{location.origin === options.passkeys
						? phrase('passkey.browserCannot')
						: phrase('passkey.openAt', { host: new URL(options.passkeys).host })}
				</span>
			)}
			{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
			{list.error && !rows ? <span className="sp-meta sp-ink-danger" role="alert">{failureMessage(list.error, phrase('failed.unreachable'))}</span> : null}
			{!rows && !list.error ? <Skeleton shape="line" /> : null}
			{rows?.map((p, i) => (
				<Fragment key={p.id}>
					{i ? <span className="sp-rule" /> : null}
					{renaming === p.id
						? <Rename passkey={p} onDone={() => setRenaming(null)} />
						: (
							<div className="sp-row-flex sp-gap-12 st-pk-row">
								<Stacked>
									<span className="sp-title sp-truncate">{p.name}</span>
									<span className="sp-meta">{phrase('passkey.added', { date: dayShortMonthYear(p.createdAt) })}{dot}{used(p.lastUsedAt)}</span>
								</Stacked>
								<div className="sp-row-flex sp-gap-8 sp-flex-none">
									<Button variant="outline" size="small" onClick={() => setRenaming(p.id)}>{phrase('action.rename')}</Button>
									<Button variant="outline" size="small" onClick={() => setRemoving(p)}>{phrase('action.remove')}</Button>
								</div>
							</div>
						)}
				</Fragment>
			))}
			<Leaving>{removing ? <Remove passkey={removing} onDone={() => setRemoving(null)} /> : null}</Leaving>
			<Leaving>{adding ? <AddPasskey onDone={() => setAdding(false)} onDeviceRefused={deviceRefused} /> : null}</Leaving>
		</Card>
	)
}

/** Adding asks for the password first: a passkey keeps working after the password changes, so a
    device that is only signed in must not be able to add one. */
function AddPasskey({ onDone, onDeviceRefused }) {
	const phrase = usePhrase()
	const [password, setPassword] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const add = () => {
		if (!password) {
			setProblem(phrase('signIn.passwordMissing'))
			return document.getElementById('passkey-password')?.focus()
		}
		setBusy(true)
		addPasskeyHere(password)
			.then(onDone)
			.catch(e => {
				if (closedPrompt(e) || alreadyHere(e) || deviceFailed(e)) return onDeviceRefused(e)
				setBusy(false)
				setProblem(e?.fields?.password ?? failureMessage(e, phrase('failed.unreachable')))
				document.getElementById('passkey-password')?.focus()
			})
	}
	return (
		<Dialog onCancel={busy ? undefined : onDone}>
			<DialogTitle>{phrase('passkey.add')}</DialogTitle>
			<DialogBody>{phrase('passkey.addBody')}</DialogBody>
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy) add() }}>
				<Field label={phrase('field.password')} id="passkey-password" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
					<PasswordField autoComplete="current-password" autoFocus value={password}
						onChange={v => { setPassword(v); setProblem(null) }} />
				</Field>
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={onDone}>{phrase('action.cancel')}</Button>
				<Button disabled={busy} onClick={add}>{phrase(busy ? 'links.adding' : 'action.continue')}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** The row open for its name, as a status is renamed in place (11a). */
function Rename({ passkey, onDone }) {
	const phrase = usePhrase()
	const [name, setName] = useState(passkey.name)
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const field = useRef(null)
	useEffect(() => { field.current?.focus() }, [])
	const empty = !name.trim()
	const save = () => {
		if (empty || busy) return
		setBusy(true)
		renamePasskey(passkey.id, name.trim())
			.then(onDone)
			.catch(e => { setBusy(false); setProblem(failureMessage(e, phrase('failed.unreachable'))) })
	}
	return (
		<div className="sp-stack sp-gap-6">
			<div className="sp-row-flex sp-gap-12 st-pk-row">
				<TextField inputRef={field} value={name} maxLength={80} aria-label={phrase('passkey.name')} onChange={v => { setName(v); setProblem(null) }}
					onKeyDown={ev => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') onDone() }} />
				<div className="sp-row-flex sp-gap-8 sp-flex-none">
					<Button variant="outline" onClick={onDone}>{phrase('action.cancel')}</Button>
					<Button disabled={empty || busy} onClick={save}>{phrase('action.save')}</Button>
				</div>
			</div>
			{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
		</div>
	)
}

/** Remove asks first (11a); the password keeps working, and nothing is sent. */
function Remove({ passkey, onDone }) {
	const phrase = usePhrase()
	const [busy, setBusy] = useState(false)
	const [problem, setProblem] = useState(null)
	const remove = () => {
		setBusy(true)
		removePasskey(passkey.id)
			.then(onDone)
			.catch(e => { setBusy(false); setProblem(failureMessage(e, phrase('failed.unreachable'))) })
	}
	return (
		<Dialog onCancel={onDone}>
			<DialogTitle>{phrase('passkey.removeTitle', { name: passkey.name, span: words => <span className="sp-break">{words}</span> })}</DialogTitle>
			<DialogBody>{problem ?? phrase('passkey.removeBody')}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onDone}>{phrase('action.keepIt')}</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={remove}>{phrase('action.remove')}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** The phone list's Passkeys row says how many there are (7a). */
export function usePasskeyCount() {
	const options = useAuthOptions()
	const list = useApi(getPasskeys)
	return options?.passkeys ? (list.data?.passkeys.length ?? null) : undefined
}
