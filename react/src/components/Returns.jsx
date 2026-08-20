import { useLocation } from 'react-router'
import { Card, CardBody, CardDivider, CardHeader, EmptyState } from './Card.jsx'
import { EntryRow } from './Rows.jsx'
import { Button } from './Button.jsx'
import { currency, dayMonth, sep } from '../api/format.js'

/* The returns in a window, on whichever page asks for them.

   One component because there is one card: Statistics and Orders overview both draw the
   window's returns, and drawing it twice is how they came to disagree. Orders' copy was a
   card-shaped stand-in -- markup with no data behind it, a permanent "No open returns found"
   that said the same thing over a month holding four returns and over a month holding none.
   An empty state is an answer, not an absence; one that cannot be anything but empty is the
   absence wearing the answer's clothes. README: Empty states, Honest Affordances.

   "Open" went with it. It meant a return whose refund has not landed -- the record carries a
   `refunded` flag and a row that has it reads "| refunded in full" -- but nothing filtered on
   it here, and nothing in the app can set it, so the word promised a distinction the product
   does not offer. The card says returns, and lists returns.

   Returns are orders, so they are drawn the way every other list of orders in this app is
   drawn: one row each, vendor avatar, date and amount, and a link to the order itself. A
   window can hold a lot of them -- a year holds 40 -- so the card carries the newest few and
   says how many there are, with the full list one click behind it. Paging inside it would be
   a second orders list, with its own state, sitting next to the real one.
   README: Data rows. */
export function ReturnsCard({ title, span, returns }) {
	const location = useLocation()
	const items = returns?.items ?? []
	return (
		<Card aria-label="Returns">
			<CardHeader title={title} />
			<CardDivider />
			<CardBody>
				{items.length ? (
					<>
						<div className="entry-list">
							{items.map(r => (
								<EntryRow key={r.id} avatar={r.vendor} name={r.vendor.name}
									meta={`${dayMonth(r.date)}${r.refunded ? `${sep}refunded in full` : ''}`}
									amount={currency(r.total)} sub={`saved ${currency(r.saved)}`}
									to={`/orders/${r.id}`}
									state={{ from: location.pathname + location.search }} />
							))}
						</div>
						{/* Said only when some are missing: "5 of 5" on a card showing all five is a
						    count that answers a question nobody asked. */}
						{returns.total > items.length ? (
							<span className="field-help entry-list-note">
								Showing the {items.length} most recent of {returns.total} returns in {span}.
							</span>
						) : null}
					</>
				) : (
					/* The icon tile stays. Six of the app's seven empty states draw it and the
					   design system's own definition opens with it; this card alone passed
					   icon={null} and a 14px padding override, so the one place two pages had to
					   agree was the one place the shape was written differently. README: Empty states. */
					<EmptyState>
						<p>No returns in {span}.</p>
					</EmptyState>
				)}
				{/* The rows are the window's; the history behind them is all of them, which is what
				    the label says and where the link goes. A card's closing action is the block
				    button in the six other cards that have one -- as a bare .button-link it declared
				    no margin of its own and stood 2px under the last row it followed. README: Buttons.

				    Only while there is a history to see: `history` is the account's count, not the
				    window's, so a quiet month over a year of returns keeps the button and a fresh
				    account is not offered a filtered list that answers nothing.
				    README: Honest Affordances. */}
				{(returns?.history ?? items.length) > 0 ? (
					<Button variant="block" to="/orders/all?status=Returned">SEE RETURN HISTORY</Button>
				) : null}
			</CardBody>
		</Card>
	)
}
