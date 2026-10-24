import { failureMessage } from '../api/client.js'
import { Button } from './Button.jsx'
import { Card, CardHeader } from './Card.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Alert } from './Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle } from './Utilities.jsx'
import { pick, reject } from './variants.js'

const VARIANT = { page: 'page', card: 'card' }

// a gateway answering for Spendly means Spendly itself was not reached
const answered = status => status > 0 && !(status >= 502 && status <= 504)

/** Why a read failed, in one plain line: a refusal written for the reader, else what the page knows. */
const reasonOf = error => failureMessage(error, answered(error?.status)
	? 'Spendly had a problem. Try again.'
	: 'Check your connection, then try again.')

/** A read that did not load and the one action that fixes it (6a, c13; c-alert's problem form).
    The title is always "<what> did not load"; `back` replaces Try again for a record that is gone.
    @param {object} props
    @param {keyof typeof VARIANT} [props.variant] `page` fills the page, `card` takes the place of one card.
    @param {string} props.what what did not load, first in the title
    @param {string} [props.label] the card's name, in the card form
    @param {{ status?: number, signedOut?: boolean }} [props.error] The error from the server. A signed-out error draws nothing, since the sign-in page takes over.
    @param {() => void} [props.onRetry]
    @param {{ to: string, label: string }} [props.back] where to go instead, for a record that is gone */
export function Failed({ variant = 'page', what, label, error, onRetry, back, ...rest }) {
	reject(rest, 'Failed')
	const form = pick(VARIANT, variant, 'variant', 'Failed')
	if (error?.signedOut) return null
	const title = `${what} did not load`
	const reason = reasonOf(error)
	const gone = error?.status === 404 && back
	const action = gone
		? <Button key="back" variant="outline" size="small" to={back.to}>{back.label}</Button>
		: <Button key="retry" variant="outline" size="small" onClick={onRetry}>Try again</Button>
	if (form === 'card') return (
		<Card footer={[action]} {...rest}>
			<CardHeader name={label} />
			<Alert color="danger" mark="!" title={title}>{reason}</Alert>
		</Card>
	)
	return (
		<Card {...rest}>
			<Empty>
				<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
				<EmptyTitle>{title}</EmptyTitle>
				{reason ? <EmptyBody>{reason}</EmptyBody> : null}
				{action}
			</Empty>
		</Card>
	)
}
