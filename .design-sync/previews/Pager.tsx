import { Card, CardBody, CardDivider, CardHeader, EntityRow, Pager } from 'spendly-react'

/* The pager every long list ends with: the range sentence on the left, PREVIOUS and NEXT on
   the right. It lives inside the list's own card body, under the rows.

   Every number is a number, not a string: `from`, `to` and `matched` are the range the page
   is showing out of the whole filtered set, and `page` / `pages` are its position. The
   buttons disable at the ends and nowhere else, which is the one honest reason to disable a
   control here. */

const avatar = (initials: string, colour: string) => (
	<span className="entry-avatar" style={{ background: colour, color: '#fff' }}>{initials}</span>
)

export const UnderAList = () => (
	<Card aria-label="All vendors">
		<CardHeader title="Vendors • 84" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<EntityRow mark={avatar('BI', '#877364')} name="Bilka" meta="34 orders"
				amount="18.420 kr." sub="saved 1.965 kr." editTo="/vendors/v-bilka/edit" />
			<EntityRow mark={avatar('EL', '#AD620D')} name="Elgiganten" meta="6 orders"
				amount="12.480 kr." sub="saved 1.240 kr." editTo="/vendors/v-elgiganten/edit" />
			<EntityRow mark={avatar('FØ', '#177DA7')} name="Føtex" meta="21 orders"
				amount="7.310 kr." sub="saved 402 kr." editTo="/vendors/v-foetex/edit" />
			<Pager from={11} to={20} matched={84} page={2} pages={9} onPage={() => {}} />
		</CardBody>
	</Card>
)

/* On page one PREVIOUS is disabled; on the last page NEXT is. */
export const FirstPage = () => (
	<Card aria-label="Orders">
		<CardBody variant="card-body-tight">
			<Pager from={1} to={10} matched={84} page={1} pages={9} onPage={() => {}} />
		</CardBody>
	</Card>
)

export const LastPage = () => (
	<Card aria-label="Orders">
		<CardBody variant="card-body-tight">
			<Pager from={81} to={84} matched={84} page={9} pages={9} onPage={() => {}} />
		</CardBody>
	</Card>
)

/* One page of results: both buttons are disabled and the "page 1 of 1" note is left off,
   because a list with one page has no position worth stating. */
export const SinglePage = () => (
	<Card aria-label="Orders">
		<CardBody variant="card-body-tight">
			<Pager from={1} to={6} matched={6} page={1} pages={1} onPage={() => {}} />
		</CardBody>
	</Card>
)

/* Nothing matched: the range sentence has no range to state, so it says so instead of
   printing "Showing 0 to 0 of 0". */
export const NothingToShow = () => (
	<Card aria-label="Orders">
		<CardBody variant="card-body-tight">
			<Pager from={0} to={0} matched={0} page={1} pages={1} onPage={() => {}} />
		</CardBody>
	</Card>
)
