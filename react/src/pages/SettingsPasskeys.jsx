import { Fragment, useEffect, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../components/Overlays.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { failureMessage, getPasskeys, removePasskey, renamePasskey } from '../api/client.js'
import { dayShortMonthYear, dot, isToday } from '../api/format.js'
import { useApi } from '../api/useApi.js'
import { addPasskeyHere, alreadyHere, closedPrompt, deviceFailed, passkeysHere } from '../app/passkeys.js'
import { useAuthOptions } from './AuthParts.jsx'
import { landing } from './SettingsParts.jsx'

const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'

const used = seconds => (seconds == null ? 'not used yet' : `last used ${isToday(seconds) ? 'today' : dayShortMonthYear(seconds)}`)

/* Passkeys, a card under Account and profile (11a) and a page of its own on a phone (7a). The
   password always keeps working, so removing the last passkey locks nobody out. */
export function PasskeysCard() {
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
		addPasskeyHere()
			.catch(e => {
				if (closedPrompt(e)) return
				setProblem(alreadyHere(e) ? 'This device already has a passkey for your account.'
					: deviceFailed(e) ? 'The passkey could not be added. Try again.' : failureMessage(e, UNREACHABLE))
			})
			.finally(() => setAdding(false))
	}
	const rows = list.data?.passkeys
	return (
		<Card>
			<CardHeader name="Passkeys" {...landing('passkeys')} control={here
				? <Button variant="outline" size="small" disabled={adding} onClick={add}><Icon name="key" size={14} />Add a passkey</Button>
				: null} />
			<span className="sp-data">Sign in with your fingerprint or face instead of typing your password. Your password keeps working.</span>
			{here ? null : (
				<span className="sp-meta">
					{location.origin === options.passkeys
						? 'This browser cannot add a passkey.'
						: `To add a passkey, open Spendly at ${new URL(options.passkeys).host}.`}
				</span>
			)}
			{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
			{list.error && !rows ? <span className="sp-meta sp-ink-danger" role="alert">{failureMessage(list.error, UNREACHABLE)}</span> : null}
			{!rows && !list.error ? <Skeleton shape="line" /> : null}
			{rows?.map((p, i) => (
				<Fragment key={p.id}>
					{i ? <span className="sp-rule" /> : null}
					{renaming === p.id
						? <Rename passkey={p} onDone={() => setRenaming(null)} />
						: (
							<div className="sp-row-flex sp-gap-12">
								<div className="sp-stack sp-gap-6">
									<span className="sp-strong sp-truncate">{p.name}</span>
									<span className="sp-meta">Added {dayShortMonthYear(p.createdAt)}{dot}{used(p.lastUsedAt)}</span>
								</div>
								<span className="sp-grow" />
								<div className="sp-row-flex sp-gap-8 sp-flex-none">
									<Button variant="outline" size="small" onClick={() => setRenaming(p.id)}>Rename</Button>
									<Button variant="outline" size="small" onClick={() => setRemoving(p)}>Remove</Button>
								</div>
							</div>
						)}
				</Fragment>
			))}
			{removing ? <Remove passkey={removing} onDone={() => setRemoving(null)} /> : null}
		</Card>
	)
}

/** The row open for its name, as a status is renamed in place (11a). */
function Rename({ passkey, onDone }) {
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
			.catch(e => { setBusy(false); setProblem(failureMessage(e, UNREACHABLE)) })
	}
	return (
		<div className="sp-stack sp-gap-6">
			<div className="sp-row-flex sp-gap-8">
				<TextField inputRef={field} value={name} maxLength={80} aria-label="Passkey name" onChange={v => { setName(v); setProblem(null) }}
					onKeyDown={ev => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') onDone() }} />
				<div className="sp-row-flex sp-gap-8 sp-flex-none">
					<Button variant="outline" size="small" onClick={onDone}>Cancel</Button>
					<Button size="small" disabled={empty || busy} onClick={save}>Save</Button>
				</div>
			</div>
			{problem ? <span className="sp-meta sp-ink-danger" role="alert">{problem}</span> : null}
		</div>
	)
}

/** Remove asks first (11a); the password keeps working, and nothing is sent. */
function Remove({ passkey, onDone }) {
	const [busy, setBusy] = useState(false)
	const [problem, setProblem] = useState(null)
	const remove = () => {
		setBusy(true)
		removePasskey(passkey.id)
			.then(onDone)
			.catch(e => { setBusy(false); setProblem(failureMessage(e, UNREACHABLE)) })
	}
	return (
		<Dialog onCancel={onDone}>
			<DialogTitle>Remove <span className="sp-break">{passkey.name}</span>?</DialogTitle>
			<DialogBody>{problem ?? 'It can no longer sign in to your account. Your password keeps working.'}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onDone}>Keep it</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy} onClick={remove}>Remove</Button>
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
