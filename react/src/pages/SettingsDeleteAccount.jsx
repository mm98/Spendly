import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardHeader } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { Field } from '../components/Field.jsx'
import { PasswordField, TextField } from '../components/Inputs.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, Leaving, useToast } from '../components/Overlays.jsx'
import { Spinner, Stacked } from '../components/Utilities.jsx'
import { deleteAccount, failureMessage, getAccountExport, getTwoStep } from '../api/client.js'
import { download } from '../api/orderImport.js'
import { useApi } from '../api/useApi.js'
import { bold, useCountdown, waitWords } from './AuthParts.jsx'
import { Waiting, cleanCode, lockedOut } from './SettingsTwoStep.jsx'
import { usePhrase } from '../language/phrases.js'


/* Delete account (11g): the last card in Account and profile, and on a phone at the end of the
   Settings account page. Its one dialog deletes the account at once. */
export function DeleteAccountCard() {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	return (
		<Card>
			<CardHeader name={phrase('deleteAccount.title')} />
			<span className="sp-data">{phrase('deleteAccount.line')}</span>
			<div className="sp-card__footer sp-row-flex sp-gap-8">
				<span className="sp-grow" />
				<Button variant="outline" size="small" color="danger" disabled={open} onClick={() => setOpen(true)}>{phrase('deleteAccount.title')}</Button>
			</div>
			<Leaving>{open ? <DeleteAccount onCancel={() => setOpen(false)} /> : null}</Leaving>
		</Card>
	)
}

/** The optional copy of the data, above the password: the button waits while the file is made. */
function CopyOfData() {
	const phrase = usePhrase()
	const toast = useToast()
	const [preparing, setPreparing] = useState(false)
	const make = () => {
		setPreparing(true)
		getAccountExport()
			.then(({ name, blob }) => download(name, blob, 'application/zip'))
			.catch(() => toast({ message: phrase('deleteAccount.copyFailed'), color: 'danger' }))
			.finally(() => setPreparing(false))
	}
	return (
		<ListItem>
			<Stacked>
				<span className="sp-title">{phrase('deleteAccount.copy')}</span>
				<span className="sp-meta">{phrase('deleteAccount.copyHelp')}</span>
			</Stacked>
			{preparing
				? <Button variant="outline" size="small" disabled><Spinner />{phrase('deleteAccount.preparing')}</Button>
				: <Button variant="outline" size="small" onClick={make}><Icon name="download" size={14} />{phrase('action.download')}</Button>}
		</ListItem>
	)
}

/** The password, and with two-step sign-in on a code, delete the account; then sign-in opens with a toast. */
function DeleteAccount({ onCancel }) {
	const phrase = usePhrase()
	const twoStep = useApi(getTwoStep).data?.on === true
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [code, setCode] = useState('')
	const [problem, setProblem] = useState(null)
	const [busy, setBusy] = useState(false)
	const [waitFor, setWaitFor] = useCountdown()
	const waiting = waitFor > 0
	useEffect(() => { if (!waiting) document.getElementById('delete-account-password')?.focus() }, [waiting])
	const select = id => requestAnimationFrame(() => {
		const field = document.getElementById(id)
		field?.focus()
		field?.select()
	})
	const send = () => {
		if (!password) {
			setProblem({ password: phrase('signIn.passwordMissing') })
			return document.getElementById('delete-account-password')?.focus()
		}
		if (twoStep && !code) {
			setProblem({ code: phrase('signIn.codeMissing') })
			return document.getElementById('delete-account-code')?.focus()
		}
		setBusy(true)
		deleteAccount(password, twoStep ? code : undefined)
			.then(() => navigate('/signin', { replace: true, state: { accountDeleted: true } }))
			.catch(e => {
				setBusy(false)
				const wait = lockedOut(e)
				if (wait) return setWaitFor(wait)
				const field = e?.fields?.code ? 'code' : 'password'
				setProblem({ [field]: e?.fields?.[field] ?? failureMessage(e, phrase('failed.unreachable')) })
				select(field === 'code' ? 'delete-account-code' : 'delete-account-password')
			})
	}
	const cancel = busy ? undefined : onCancel
	return (
		<Dialog onCancel={cancel}>
			<DialogTitle>{phrase('deleteAccount.ask')}</DialogTitle>
			<DialogBody>{phrase('deleteAccount.body')}</DialogBody>
			<CopyOfData />
			{waiting ? <Waiting title={phrase('signIn.tooManyAttempts')}>{phrase('wait.tryAgainIn', { wait: waitWords(waitFor), b: bold })}</Waiting> : null}
			<form className="sp-stack sp-gap-12" noValidate onSubmit={ev => { ev.preventDefault(); if (!busy && !waiting) send() }}>
				<Field label={phrase('field.password')} id="delete-account-password" message={problem?.password} messageType={problem?.password ? 'danger' : 'hint'}>
					<PasswordField autoComplete="current-password" autoFocus value={password} disabled={waiting}
						onChange={v => { setPassword(v); setProblem(null) }} />
				</Field>
				{twoStep
					? (
						<Field label={phrase('field.anyCode')} id="delete-account-code" message={problem?.code} messageType={problem?.code ? 'danger' : 'hint'}>
							<TextField code autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={9} value={code} disabled={waiting}
								onChange={v => { setCode(cleanCode(v)); setProblem(null) }} />
						</Field>
					)
					: null}
				<button type="submit" hidden />
			</form>
			<DialogActions>
				<Button variant="outline" disabled={busy} onClick={cancel}>{phrase('action.cancel')}</Button>
				<span className="sp-grow" />
				<Button color="danger" disabled={busy || waiting} onClick={send}>{phrase(busy ? 'action.deleting' : 'deleteAccount.title')}</Button>
			</DialogActions>
		</Dialog>
	)
}
