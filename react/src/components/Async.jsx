import { Card, CardBody, EmptyState } from './Card.jsx'

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
