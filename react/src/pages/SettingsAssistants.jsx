import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { Well } from '../components/Well.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { createMcpToken, failureMessage, getMcpTokens, removeMcpToken } from '../api/client.js'
import { dayShortMonthYear, dot, isToday } from '../api/format.js'
import { useApi } from '../api/useApi.js'
import { landing } from './SettingsParts.jsx'

const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'
// the server refuses a 21st token with the same number
const MOST = 20
const COPIED_MS = 2000

const used = seconds => (seconds == null ? 'never used' : `last used ${isToday(seconds) ? 'today' : dayShortMonthYear(seconds)}`)

/* Each program's one line and its setup text, with the token filled in (11e). Claude Code first. */
const SETUPS = [
	{ value: 'claude', label: 'Claude', line: 'In Claude, on the web or the desktop app, open Settings, Connectors, Add custom connector, and paste this address:',
		text: ({ withToken }) => withToken },
	{ value: 'claude-code', label: 'Claude Code', line: 'Run this in a terminal:',
		text: ({ address, token }) => `claude mcp add --transport http spendly ${address} --header "Authorization: Bearer ${token}"` },
	{ value: 'cursor', label: 'Cursor', line: 'Add this to ~/.cursor/mcp.json:',
		text: ({ address, token }) => `{\n  "mcpServers": {\n    "spendly": {\n      "url": ${JSON.stringify(address)},\n      "headers": { "Authorization": ${JSON.stringify(`Bearer ${token}`)} }\n    }\n  }\n}` },
	{ value: 'chatgpt', label: 'ChatGPT', line: 'In ChatGPT, open Settings, Connectors, Create, and paste this address:',
		text: ({ withToken }) => withToken }
]

/* An address opened over plain http on a home network has no clipboard API, so the older way is tried there. */
async function copyText(text) {
	if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
	const box = document.createElement('textarea')
	box.value = text
	box.setAttribute('readonly', '')
	box.style.position = 'fixed'
	box.style.opacity = '0'
	document.body.append(box)
	box.select()
	const done = document.execCommand('copy')
	box.remove()
	if (!done) throw new Error('copy refused')
}

/** The copy button's icon turns to a check for two seconds, and the toast says so (11e). */
function useCopy() {
	const toast = useToast()
	const [copied, setCopied] = useState(null)
	const timer = useRef(0)
	useEffect(() => () => clearTimeout(timer.current), [])
	const copy = (key, text) => copyText(text)
		.then(() => {
			setCopied(key)
			clearTimeout(timer.current)
			timer.current = setTimeout(() => setCopied(null), COPIED_MS)
			toast({ message: 'Copied.' })
		})
		.catch(() => toast({ message: 'Spendly could not copy it. Select the text and copy it yourself.', color: 'danger' }))
	return { copied, copy }
}

/* AI assistants (11e): the tokens an assistant program reads this account with, in the Passkeys
   family. A pane of its own on a wide screen, and a page of its own on a phone (7a). */
export function AssistantsCard({ state, touch }) {
	const list = useApi(getMcpTokens)
	const { naming, setNaming, made, setMade } = state
	const [removing, setRemoving] = useState(null)
	const rows = list.data?.tokens
	const full = (rows?.length ?? 0) >= MOST
	return (
		<Card footerCommits footer={made ? <Button fullWidth onClick={() => setMade(null)}>Done</Button> : undefined}>
			<CardHeader name="AI assistants" {...landing('assistants')}
				control={<Button variant="outline" size="small" disabled={naming || made != null || full || !rows} onClick={() => setNaming(true)}><Icon name="plus" size={14} />New token</Button>} />
			<span className="sp-data">Let an assistant such as Claude look up your orders, vendors and budget. A token gives it read-only access to this account: it can read, never change or delete.</span>
			{full ? <span className="sp-meta">{MOST} of {MOST} tokens. Remove one to make another.</span> : null}
			{list.error && !rows ? <span className="sp-meta sp-ink-danger" role="alert">{failureMessage(list.error, UNREACHABLE)}</span> : null}
			{!rows && !list.error ? <Skeleton shape="line" /> : null}
			{naming ? <NameToken onCancel={() => setNaming(false)} onMade={token => { setNaming(false); setMade(token) }} /> : null}
			{made ? <MadeToken token={made} touch={touch} /> : null}
			{rows?.map((t, i) => (
				<Fragment key={t.id}>
					{i || made ? <span className="sp-rule" /> : null}
					<div className="sp-row-flex sp-gap-12 st-pk-row">
						<Stacked>
							<span className="sp-title sp-truncate">{t.name}</span>
							<span className="sp-meta">Made {dayShortMonthYear(t.createdAt)}{dot}{used(t.lastUsedAt)}</span>
						</Stacked>
						<span className="sp-grow" />
						<Button variant="outline" size="small" onClick={() => setRemoving(t)}>Remove</Button>
					</div>
				</Fragment>
			))}
			<Leaving>{removing ? <Remove token={removing} onDone={() => setRemoving(null)}
				onRemoved={() => { setRemoving(null); if (made?.id === removing.id) setMade(null) }} /> : null}</Leaving>
		</Card>
	)
}

/** Kept by the Settings page, so a layout change between phone and wide screen keeps the new token
    shown: it is shown once, and lost when Settings is left. */
export function useAssistantsState() {
	const [naming, setNaming] = useState(false)
	const [made, setMade] = useState(null)
	return { naming, setNaming, made, setMade }
}

/** The naming row, the passkey rename row's shape: Enter creates, Escape cancels. */
function NameToken({ onCancel, onMade }) {
	const [name, setName] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const field = useRef(null)
	const help = useId()
	useEffect(() => { field.current?.focus() }, [])
	const create = () => {
		if (busy) return
		if (!name.trim()) {
			setProblem('Give the token a name.')
			return field.current?.focus()
		}
		setBusy(true)
		createMcpToken(name.trim())
			.then(onMade)
			.catch(e => { setBusy(false); setProblem(failureMessage(e, UNREACHABLE)) })
	}
	return (
		<div className="sp-field">
			<div className="sp-row-flex sp-gap-12 st-pk-row">
				<TextField inputRef={field} value={name} maxLength={80} placeholder="Claude on my laptop" aria-label="Token name"
					danger={problem != null} aria-describedby={problem ? help : undefined}
					onChange={v => { setName(v); setProblem(null) }}
					onKeyDown={ev => { if (ev.key === 'Enter') create(); if (ev.key === 'Escape') onCancel() }} />
				<div className="sp-row-flex sp-gap-8 sp-flex-none">
					<Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
					<Button disabled={busy} onClick={create}>Create</Button>
				</div>
			</div>
			{problem ? <span className="sp-field__help" data-color="danger" id={help}>{problem}</span> : null}
		</div>
	)
}

/** The one time a token is shown: the token, both addresses and, off a phone, each program's setup. */
function MadeToken({ token, touch }) {
	const { copied, copy } = useCopy()
	const [setup, setSetup] = useState('claude-code')
	// the address this Spendly is opened on is the one the assistant reaches it at
	const address = `${location.origin}/mcp`
	const values = { token: token.token, address, withToken: `${address}/${token.token}` }
	const chosen = SETUPS.find(s => s.value === setup)
	// the snippet well holds the field's own trailing button (c26)
	const button = (key, text, label) => (
		<button type="button" className="sp-icon-btn sp-icon-btn--field sp-field__trail" aria-label={label} onClick={() => copy(key, text)}>
			<Icon name={copied === key ? 'check' : 'copy'} size={15} />
		</button>
	)
	const readOnly = (key, label, text, message) => (
		<Field label={label} message={message}>
			<TextField variant="readonly" readOnly value={text} action={{ icon: copied === key ? 'check' : 'copy', label: `Copy the ${label.toLowerCase()}`, onClick: () => copy(key, text) }} />
		</Field>
	)
	return (
		<>
			<span className="sp-title">{token.name}</span>
			<Well color="warning">
				<span className="sp-title sp-ink-warning">Copy the token now. It won't be shown again.</span>
				<span className="sp-meta sp-ink-warning">If you lose it, remove it and make a new one.</span>
			</Well>
			{readOnly('token', 'Token', values.token)}
			{readOnly('address', 'Address', values.address, 'Send the token with it, as the header Authorization: Bearer and the token.')}
			{readOnly('with-token', 'Address with the token in it', values.withToken, 'For a program that takes only an address.')}
			{touch
				? null
				: (
					<>
						<span className="sp-field__label" id="assistants-setup-label">Set up in</span>
						<Segmented name="assistants-setup" fullWidth role="radiogroup" aria-labelledby="assistants-setup-label"
							options={SETUPS} value={setup} onChange={setSetup} />
						<span className="sp-meta">{chosen.line}</span>
						<Well variant="snippet">
							<span className="sp-data">{chosen.text(values)}</span>
							{button(`setup-${chosen.value}`, chosen.text(values), `Copy the setup for ${chosen.label}`)}
						</Well>
					</>
				)}
		</>
	)
}

/** Remove asks first (11e): the program using the token stops at once, and there is no undo. */
function Remove({ token, onDone, onRemoved }) {
	const toast = useToast()
	const [busy, setBusy] = useState(false)
	const [problem, setProblem] = useState(null)
	const remove = () => {
		setBusy(true)
		removeMcpToken(token.id)
			.then(() => { onRemoved(); toast({ message: 'Token removed.' }) })
			.catch(e => { setBusy(false); setProblem(failureMessage(e, UNREACHABLE)) })
	}
	return (
		<Dialog onCancel={busy ? undefined : onDone}>
			<DialogTitle>Remove <span className="sp-break">{token.name}</span>?</DialogTitle>
			<DialogBody>{problem ?? "An assistant using this token stops reading Spendly at once. This can't be undone."}</DialogBody>
			<DialogActions>
				<Button variant="outline" fullWidth disabled={busy} onClick={onDone}>Keep the token</Button>
				<Button color="danger" fullWidth disabled={busy} onClick={remove}>Remove token</Button>
			</DialogActions>
		</Dialog>
	)
}

/** The phone list's AI assistants row says how many tokens there are (7a). */
export function useAssistantTokenCount() {
	const list = useApi(getMcpTokens)
	return list.data?.tokens.length ?? null
}
