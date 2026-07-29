import { Card, CardBody, EmptyState } from './Card.jsx'

/* What a page shows while the phantom API is answering, and what it shows when it will not.

   Neither state is decoration. A page that renders its frame with nothing in it looks like
   an answer -- an empty list reads as "no orders", not as "not loaded yet" -- so the wait
   says it is a wait, and the failure says what failed. aria-busy is on the region rather
   than a spinner somewhere else, because it is this content that is not ready. */

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
	if (state.data === undefined) {
		return (
			<Card aria-busy="true" aria-label={label}>
				<CardBody variant="card-body-centered">
					<p className="field-help">{label}…</p>
				</CardBody>
			</Card>
		)
	}
	/* Data is present. A refetch in the background keeps the last good render on screen
	   rather than collapsing the layout, and says so on the region for anything listening. */
	return <div aria-busy={state.loading || undefined} style={{ display: 'contents' }}>{children(state.data)}</div>
}
