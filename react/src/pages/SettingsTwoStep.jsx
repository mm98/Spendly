import { useEffect, useState } from 'react'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, Leaving, useToast } from '../components/Overlays.jsx'
import { Skeleton, Stacked } from '../components/Utilities.jsx'
import { Well } from '../components/Well.jsx'
import {
	confirmTwoStep, failureMessage, getCurrentUser, getTwoStep, renewRecoveryCodes, startTwoStep, turnOffTwoStep
} from '../api/client.js'
import { dayShortMonthYear } from '../api/format.js'
import { useApi } from '../api/useApi.js'
import { useCountdown, waitWords } from './AuthParts.jsx'
import { useCopy } from './SettingsAssistants.jsx'
import { landing } from './SettingsParts.jsx'

const UNREACHABLE = 'Spendly could not be reached. Check your connection and try again.'
const LINE = 'After your password, Spendly also asks for a code from an app on your phone.'
const RECOVERY_CODE_COUNT = 10
// at or under this many left, the count asks for new ones (11f)
const FEW_CODES = 3

// spaces typed or pasted are dropped (11f)
const cleanCode = value => value.replace(/\s+/g, '')
const lockedOut = e => (e?.status === 429 && e.body?.retryAfter ? e.body.retryAfter : 0)

const codesLeftLine = left => `${left} of ${RECOVERY_CODE_COUNT} recovery codes left${left === 0 ? '. Make new ones now.'
	: left <= FEW_CODES ? '. Make new ones before they run out.' : ''}`

/* Two-step sign-in (11f): a card under Passkeys in Account and profile, and a page of its own on a
   phone (7a). Off until the person turns it on. */
export function TwoStepCard() {
	const state = useApi(getTwoStep)
	const toast = useToast()
	const [open, setOpen] = useState(null)
	const data = state.data
	const close = message => {
		setOpen(null)
		if (message) toast({ message })
	}
	return (
		<Card>
			<CardHeader name="Two-step sign-in" {...landing('two-step')} control={data?.available && !data.on
				? <Button variant="outline" size="small" disabled={open === 'on'} onClick={() => setOpen('on')}><Icon name="lock" size={14} />Turn on</Button>
				: null} />
			<span className="sp-data">{LINE}</span>
			{state.error && !data ? <span className="sp-meta sp-ink-danger" role="alert">{failureMessage(state.error, UNREACHABLE)}</span> : null}
			{!data && !state.error ? <Skeleton shape="line" /> : null}
			{data && !data.available ? <span className="sp-meta">Two-step sign-in is not available on this server.</span> : null}
			{data?.on
				? (
					<>
						<div className="sp-row-flex sp-gap-12 st-pk-row">
							<Stacked>
								<span className="sp-title sp-truncate">On since {dayShortMonthYear(data.onSince)}</span>
								<span className={data.recoveryCodesLeft <= FEW_CODES ? 'sp-meta sp-ink-warning' : 'sp-meta'}>{codesLeftLine(data.recoveryCodesLeft)}</span>
							</Stacked>
						</div>
						<div className="sp-card__footer sp-row-flex sp-gap-8">
							<span className="sp-grow" />
							<Button variant="outline" size="small" onClick={() => setOpen('codes')}>New recovery codes</Button>
							<Button variant="outline" size="small" onClick={() => setOpen('off')}>Turn off</Button>
						</div>
					</>
				)
				: null}
			<Leaving>{open === 'on' ? <TurnOn onDone={close} /> : null}</Leaving>
			<Leaving>{open === 'codes' ? <NewCodes onDone={close} /> : null}</Leaving>
			<Leaving>{open === 'off' ? <TurnOff onDone={close} /> : null}</Leaving>
		</Card>
	)
}

/** The phone list's row says On, Off or Not available (7a); undefined until the server answers. */
export function useTwoStepWord() {
	const data = useApi(getTwoStep).data
	return data ? (!data.available ? 'Not available' : data.on ? 'On' : 'Off') : undefined
}

/** The warning row above a field that waits, counting down (11f). */
function Waiting({ title, children }) {
	return (
		<ListItem variant="top" color="warning" role="alert">
			<Icon name="lock" />
			<span className="sp-stack sp-gap-6">
				<span className="sp-title sp-ink-warning">{title}</span>
				<span className="sp-meta sp-ink-warning">{children}</span>
			</span>
		</ListItem>
	)
}

/** One field for a code: 6 digits from the app, or with `either` a recovery code too. */
function CodeField({ id, label, value, onChange, problem, disabled = false, either = false }) {
	const kind = either
		? { autoComplete: 'off', autoCapitalize: 'characters', spellCheck: false, maxLength: 9 }
		: { inputMode: 'numeric', autoComplete: 'one-time-code', pattern: '[0-9]*', maxLength: 6 }
	return (
		<Field label={label} id={id} message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
			<TextField {...kind} autoFocus value={value} disabled={disabled} onChange={v => onChange(cleanCode(v))} />
		</Field>
	)
}

// a wrong code keeps its digits and selects them, so the next one types over them (11f)
const selectField = id => requestAnimationFrame(() => {
	const field = document.getElementById(id)
	field?.focus()
	field?.select()
})

/** "1 of 3" sits on the heading's line (11f). */
function StepTitle({ step }) {
	return (
		<div className="sp-row-flex sp-gap-8 sp-baseline">
			<DialogTitle>Turn on two-step sign-in</DialogTitle>
			<span className="sp-grow" />
			<span className="sp-meta sp-nowrap">{step} of 3</span>
		</div>
	)
}

/** One dialog in three steps, then the recovery codes: nothing is on until step 3 is right (11f). */
function TurnOn({ onDone }) {
	const [step, setStep] = useState(1)
	const [password, setPassword] = useState('')
	const [setup, setSetup] = useState(null)
	const [code, setCode] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const [waitFor, setWaitFor] = useCountdown()
	const [codes, setCodes] = useState(null)
	const { copied, copy } = useCopy()
	const waiting = waitFor > 0
	useEffect(() => { if (!waiting && step !== 2) document.getElementById(step === 1 ? 'two-step-password' : 'two-step-code')?.focus() }, [waiting])

	const failed = (e, field) => {
		setBusy(false)
		const wait = lockedOut(e)
		if (wait) return setWaitFor(wait)
		setProblem(e?.fields?.[field] ?? failureMessage(e, UNREACHABLE))
		selectField(field === 'password' ? 'two-step-password' : 'two-step-code')
	}
	const sendPassword = () => {
		if (!password) {
			setProblem('Enter your password.')
			return document.getElementById('two-step-password')?.focus()
		}
		setBusy(true)
		startTwoStep(password)
			.then(answer => { setBusy(false); setSetup(answer); setPassword(''); setStep(2) })
			.catch(e => failed(e, 'password'))
	}
	const sendCode = () => {
		if (!code) {
			setProblem('Enter the code.')
			return document.getElementById('two-step-code')?.focus()
		}
		setBusy(true)
		confirmTwoStep(code)
			.then(answer => { setBusy(false); setCodes(answer.recoveryCodes) })
			.catch(e => failed(e, 'code'))
	}

	const codeParts = useRecoveryCodeParts({ title: 'Two-step sign-in is on', codes, onDone: () => onDone('Two-step sign-in is on.') })
	if (codeParts) return <Dialog>{codeParts}</Dialog>
	const cancel = busy ? undefined : () => onDone()
	const qr = setup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qr)}` : null
	return (
		<Dialog onCancel={cancel}>
			<StepTitle step={step} />
			{step === 1
				? (waiting
					? <Waiting title="Too many attempts">Try again in <b>{waitWords(waitFor)}</b>.</Waiting>
					: <DialogBody>Enter your password first.</DialogBody>)
				: step === 2
					? <DialogBody>Scan this with your authenticator app. Google Authenticator, Microsoft Authenticator and 1Password all work, and 1Password can read it straight from this screen.</DialogBody>
					: waiting
						? <Waiting title="Too many tries">Wait <b>{waitWords(waitFor)}</b>, then type the newest code.</Waiting>
						: <DialogBody>Type the 6-digit code the app now shows.</DialogBody>}
			{step === 2
				? (
					<>
						<img className="st-qr" src={qr} alt="QR code to scan with your authenticator app" />
						<span className="sp-meta">Can't scan it? Type this key into the app instead.</span>
						<Well variant="snippet">
							<span className="sp-data sp-number">{setup.key.match(/.{1,4}/g).join(' ')}</span>
							<button type="button" className="sp-icon-btn sp-icon-btn--field sp-field__trail" aria-label="Copy the key" onClick={() => copy('key', setup.key)}>
								<Icon name={copied === 'key' ? 'check' : 'copy'} size={15} />
							</button>
						</Well>
					</>
				)
				: (
					<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !waiting) (step === 1 ? sendPassword : sendCode)() }}>
						{step === 1
							? (
								<Field label="Password" id="two-step-password" message={problem ?? undefined} messageType={problem ? 'danger' : 'hint'}>
									<PasswordField autoComplete="current-password" autoFocus value={password} disabled={waiting}
										onChange={v => { setPassword(v); setProblem(null) }} />
								</Field>
							)
							: <CodeField id="two-step-code" label="Code" value={code} problem={problem} disabled={waiting} onChange={v => { setCode(v); setProblem(null) }} />}
						<button type="submit" hidden />
					</form>
				)}
			<DialogActions>
				{step === 3 ? <><Button variant="outline" disabled={busy} onClick={() => { setProblem(null); setStep(2) }}>Back</Button><span className="sp-grow" /></> : null}
				<Button variant="outline" disabled={busy} onClick={cancel}>Cancel</Button>
				{step === 1 ? <Button disabled={busy || waiting} onClick={sendPassword}>{busy ? 'Checking…' : 'Continue'}</Button>
					: step === 2 ? <Button onClick={() => { setProblem(null); setStep(3) }}>Next</Button>
					: <Button disabled={busy || waiting} onClick={sendCode}>{busy ? 'Turning on…' : 'Turn on'}</Button>}
			</DialogActions>
		</Dialog>
	)
}

/** Shown once: only "I have saved them" closes it, not Escape or the scrim (11f). The parts go in the
    dialog that asked for the code, so it changes in place and does not open a second time. Null until there are codes. */
function useRecoveryCodeParts({ title, codes, renewed = false, onDone }) {
	const email = useApi(getCurrentUser).data?.email
	const { copy } = useCopy()
	// the button that sent the code is gone, so focus would fall to the page behind
	useEffect(() => { if (codes) document.querySelector('.sp-dialog__actions button')?.focus() }, [codes])
	if (!codes) return null
	const download = () => {
		const text = [email, dayShortMonthYear(Math.floor(Date.now() / 1000)), '', ...codes, ''].filter(line => line != null).join('\n')
		const link = document.createElement('a')
		link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
		link.download = 'spendly-recovery-codes.txt'
		link.click()
		setTimeout(() => URL.revokeObjectURL(link.href), 0)
	}
	return [
		<DialogTitle key="title">{title}</DialogTitle>,
		<Well key="warning" color="warning">
			<span className="sp-title sp-ink-warning">Save these codes now. They won't be shown again.</span>
			<span className="sp-meta sp-ink-warning">Each code works once, in place of a code from the app.</span>
		</Well>,
		renewed ? <span key="renewed" className="sp-data">Your old recovery codes no longer work.</span> : null,
		<Well key="codes">
			<div className="st-codes">{codes.map(code => <span key={code} className="sp-data sp-number">{code}</span>)}</div>
		</Well>,
		<div key="download" className="sp-row-flex sp-gap-8">
			<Button variant="outline" size="small" onClick={() => copy('codes', codes.join('\n'))}><Icon name="copy" size={14} />Copy all</Button>
			<Button variant="outline" size="small" onClick={download}><Icon name="download" size={14} />Download</Button>
		</div>,
		<DialogActions key="actions">
			<Button onClick={onDone}>I have saved them</Button>
		</DialogActions>
	]
}

/** A right code from the app or a recovery code replaces all 10 (11f). */
function NewCodes({ onDone }) {
	const [code, setCode] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const [waitFor, setWaitFor] = useCountdown()
	const [codes, setCodes] = useState(null)
	const waiting = waitFor > 0
	// the dialog puts focus on its buttons, so the field takes it back
	useEffect(() => { if (!waiting) document.getElementById('two-step-renew')?.focus() }, [waiting])
	const send = () => {
		if (!code) {
			setProblem('Enter the code.')
			return document.getElementById('two-step-renew')?.focus()
		}
		setBusy(true)
		renewRecoveryCodes(code)
			.then(answer => { setBusy(false); setCodes(answer.recoveryCodes) })
			.catch(e => {
				setBusy(false)
				const wait = lockedOut(e)
				if (wait) return setWaitFor(wait)
				setProblem(e?.fields?.code ?? failureMessage(e, UNREACHABLE))
				selectField('two-step-renew')
			})
	}
	const codeParts = useRecoveryCodeParts({ title: 'Your new recovery codes', codes, renewed: true, onDone: () => onDone() })
	if (codeParts) return <Dialog>{codeParts}</Dialog>
	const cancel = busy ? undefined : () => onDone()
	return (
		<Dialog onCancel={cancel}>
			<DialogTitle>New recovery codes</DialogTitle>
			{waiting
				? <Waiting title="Too many tries">Wait <b>{waitWords(waitFor)}</b>, then type the newest code.</Waiting>
				: <DialogBody>Type a code from your authenticator app, or one of your recovery codes.</DialogBody>}
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !waiting) send() }}>
				<CodeField id="two-step-renew" label="Code from the app or a recovery code" either value={code} problem={problem} disabled={waiting}
					onChange={v => { setCode(v); setProblem(null) }} />
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={cancel}>Cancel</Button>
				<Button disabled={busy || waiting} onClick={send}>{busy ? 'Making…' : 'Make new codes'}</Button>
			</DialogActions>
		</Dialog>
	)
}

/** The password and a code in one go; a wrong pair is answered vaguely, as sign-in does (11f). */
function TurnOff({ onDone }) {
	const [password, setPassword] = useState('')
	const [code, setCode] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const [waitFor, setWaitFor] = useCountdown()
	const waiting = waitFor > 0
	useEffect(() => { if (!waiting) document.getElementById('two-step-off-password')?.focus() }, [waiting])
	const send = () => {
		if (!password) {
			setProblem({ password: 'Enter your password.' })
			return document.getElementById('two-step-off-password')?.focus()
		}
		if (!code) {
			setProblem({ code: 'Enter the code.' })
			return document.getElementById('two-step-off-code')?.focus()
		}
		setBusy(true)
		turnOffTwoStep(password, code)
			.then(() => onDone('Two-step sign-in is off.'))
			.catch(e => {
				setBusy(false)
				const wait = lockedOut(e)
				if (wait) return setWaitFor(wait)
				setProblem({ code: e?.fields?.code ?? failureMessage(e, UNREACHABLE) })
				selectField('two-step-off-code')
			})
	}
	const cancel = busy ? undefined : () => onDone()
	return (
		<Dialog onCancel={cancel}>
			<DialogTitle>Turn off two-step sign-in?</DialogTitle>
			{waiting
				? <Waiting title="Too many attempts">Try again in <b>{waitWords(waitFor)}</b>.</Waiting>
				: <DialogBody>The app's key and your recovery codes are removed, and signing in asks only for your password.</DialogBody>}
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !waiting) send() }}>
				<Field label="Password" id="two-step-off-password" message={problem?.password} messageType={problem?.password ? 'danger' : 'hint'}>
					<PasswordField autoComplete="current-password" autoFocus value={password} disabled={waiting}
						onChange={v => { setPassword(v); setProblem(null) }} />
				</Field>
				<Field label="Code from the app or a recovery code" id="two-step-off-code" message={problem?.code} messageType={problem?.code ? 'danger' : 'hint'}>
					<TextField autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={9} value={code} disabled={waiting}
						onChange={v => { setCode(cleanCode(v)); setProblem(null) }} />
				</Field>
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={cancel}>Cancel</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy || waiting} onClick={send}>{busy ? 'Turning off…' : 'Turn off'}</Button>
			</DialogActions>
		</Dialog>
	)
}
