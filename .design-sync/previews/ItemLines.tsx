import { Card, CardBody, CardDivider, CardHeader, ItemLines } from 'spendly-react'

/* The whole items block on an order: the list, the card a line opens into when the pencil is
   pressed, and the dashed row that adds one. The host owns the array and hands back a new one
   on every change; everything else -- editing, validating, reordering, deleting -- is here. */

const noop = () => {}

const thumbnail = 'data:image/svg+xml;utf8,' + encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
		<rect width="120" height="120" fill="#D9E0D6"/>
		<rect x="34" y="26" width="52" height="72" rx="6" fill="#3C5B48"/>
		<rect x="34" y="60" width="52" height="16" fill="#E9C517"/>
		<circle cx="60" cy="44" r="9" fill="#F4F5F0"/>
	</svg>`)

const items = [
	{ id: 'i-1', title: 'Merrild kaffe, 500 g', quantity: 2, price: 49.95, retail: 64.95 },
	{ id: 'i-2', title: 'Arla letmælk, 1 l', quantity: 6, price: 12.5 },
	{ id: 'i-3', title: 'Toiletpapir, 8 ruller', quantity: 1, price: 34.5, retail: 42 }
]

/* Which line has a picture, and where it is. A page answers from what it knows: a file picked
   in this session, or an attachment already on the server. */
const photoOf = (item: { id: string }) =>
	(item.id === 'i-1' ? { present: true, src: thumbnail } : {})

/* Edit order: the card names the list and carries the count, so `heading={false}` keeps the
   list from naming itself a second time. Three lines, so every row has a grip. */
export const OnAnOrder = () => (
	<Card aria-label="Items">
		<CardHeader title="Items • 3">
			<span className="field-help">drag a line to reorder it</span>
		</CardHeader>
		<CardDivider />
		<CardBody>
			<ItemLines items={items} onItemsChange={noop} onAnnounce={noop} photoOf={photoOf}
				heading={false} />
		</CardBody>
	</Card>
)

/* Step 2 of a new order, where the list is a section inside a wider form and has no card band
   of its own -- so it draws its own name, count and hint. One line, so no row has a grip and
   the hint names the pencil instead. */
export const AsASection = () => (
	<ItemLines items={[items[0]]} onItemsChange={noop} onAnnounce={noop} photoOf={photoOf}
		label="Items" />
)

/* Nothing added yet, and the form has been submitted once. The rejection is drawn where a
   field's own would be, and the dashed row says what an order needs. */
export const Nothing = () => (
	<ItemLines items={[]} onItemsChange={noop} onAnnounce={noop}
		label="Items" error="An order needs at least one item." />
)
