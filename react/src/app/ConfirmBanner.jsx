import { useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Icon } from '../components/Icon.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { useApi } from '../api/useApi.js'
import { failureMessage, getCurrentUser, resendConfirmation } from '../api/client.js'

const HIDDEN = 'spendly:confirm-banner-hidden'
const hidden = () => { try { return sessionStorage.getItem(HIDDEN) === '1' } catch { return false } }
const hide = () => { try { sessionStorage.setItem(HIDDEN, '1') } catch { /* storage denied */ } }

/** An address still waiting for its link, at the top of the content column (20b, 20e). It scrolls
    with the page and closes for this browser session; scanning and importing stay held either way. */
export function ConfirmBanner() {
	const user = useApi(getCurrentUser).data
	const [closed, setClosed] = useState(hidden)
	const [said, setSaid] = useState(null)
	const [busy, setBusy] = useState(false)
	const waiting = user && !user.emailConfirmed && user.mail
	if (!waiting || closed) return null
	const resend = () => {
		setBusy(true)
		resendConfirmation()
			.then(out => setSaid(`A new link is on its way to ${out.email}.`))
			.catch(e => setSaid(e?.status === 429 ? 'A link was sent a moment ago. Look for it in your email.' : failureMessage(e, 'The link could not be sent. Try again.')))
			.finally(() => setBusy(false))
	}
	return (
		<div className="au-banner">
			<ListItem color="warning">
				<Icon name="mail" size={18} />
				<span className="sp-data sp-ink-warning sp-grow">
					{said ?? <>Confirm <b>{user.email}</b> to scan receipts and import orders.</>}
				</span>
				{said ? null : <Button variant="outline" size="xsmall" color="warning" disabled={busy} onClick={resend}>Resend</Button>}
				<IconButton icon="x" size="small" aria-label="Dismiss" onClick={() => { hide(); setClosed(true) }} />
			</ListItem>
		</div>
	)
}
