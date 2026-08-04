import { useRouteError } from 'react-router'
import { Card, CardBody, EmptyState } from './Card.jsx'
import { Button } from './Button.jsx'

/* What a page shows while the phantom API is answering, and what it shows when it will not.

   Neither state is decoration. A page that renders its frame with nothing in it looks like
   an answer -- an empty list reads as "no orders", not as "not loaded yet" -- so the wait
   says it is a wait, and the failure says what failed. aria-busy is on the region rather
   than a spinner somewhere else, because it is this content that is not ready. */

/** The wait, on its own. A page whose chunk has not arrived and a card whose data has not
    arrived are the same wait to the reader, so they are the same card -- see Shell.jsx, which
    hangs this off the route boundary. */
export const Waiting = ({ label = 'Loading' }) => (
	<Card aria-busy="true" aria-label={label}>
		<CardBody variant="card-body-centered">
			<p className="field-help">{label}…</p>
		</CardBody>
	</Card>
)

export function Async({ state, children, label = 'Loading' }) {
	if (state.error) {
		return (
			<Card>
				<CardBody>
					<EmptyState icon="alert">
						<p>{state.error.status === 404 ? 'Nothing here.' : 'That did not load.'} {state.error.message}</p>
					</EmptyState>
				</CardBody>
			</Card>
		)
	}
	if (state.data === undefined) return <Waiting label={label} />
	/* Data is present. A refetch in the background keeps the last good render on screen
	   rather than collapsing the layout, and says so on the region for anything listening. */
	return <div aria-busy={state.loading || undefined} style={{ display: 'contents' }}>{children(state.data)}</div>
}

/** The route's own `errorElement` (see routes.jsx). Without one, a throw during render --
    an unknown icon name, anything else uncaught -- takes the whole app to a blank white
    screen: React unmounts every component above the nearest error boundary, and this router
    had none. Reloading is the only recovery offered because the error is a bug, not a state
    the app can route around; the message stays generic since the reader is not the person
    who can act on a stack trace. */
export function RouteError() {
	const error = useRouteError()
	if (import.meta.env.DEV) console.error(error)
	return (
		<Card>
			<CardBody>
				<EmptyState icon="alert">
					<p>Something went wrong loading this page.</p>
					<Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
				</EmptyState>
			</CardBody>
		</Card>
	)
}
