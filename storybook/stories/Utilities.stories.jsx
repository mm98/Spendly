import { Kbd, Empty, EmptyTitle, EmptyBody, Skeleton, Spinner, Redacted, AddRow, Hold } from '../../react/src/components/Utilities.jsx'
import { Card, Cards } from '../../react/src/components/Card.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'

export default { title: 'States/Empty, loading and keys' }

export const EmptyStates = {
	render: () => (
		<Cards>
			<Card>
				<Empty>
					<Mark size="large" fill="none" aria-label="No orders"><Icon name="receipt" /></Mark>
					<EmptyTitle>No orders in August</EmptyTitle>
					<EmptyBody>Every order you scan or enter will appear here.</EmptyBody>
					<Button iconStart="plus">New order</Button>
				</Empty>
			</Card>
			<Card>
				<Empty dashed>
					<EmptyTitle>Nothing matches those filters</EmptyTitle>
					<EmptyBody>Three filters are on: August, Decor, over 1.000 kr.</EmptyBody>
					<Button variant="outline">Clear the filters</Button>
				</Empty>
			</Card>
		</Cards>
	)
}

export const Loading = {
	render: () => (
		<div className="sp-stack sp-gap-12" style={{ maxWidth: 560 }}>
			<div className="sp-row-flex sp-gap-12">
				<Skeleton shape="mark" />
				<div className="sp-stack sp-gap-6 sp-grow">
					<Skeleton shape="title" />
					<Skeleton shape="line" />
				</div>
				<Skeleton shape="pill" />
				<Skeleton shape="end" />
			</div>
			<div className="sp-row-flex sp-gap-8">
				<Spinner />
				<span className="sp-subtitle">Reading the receipt</span>
			</div>
		</div>
	)
}

export const HeldInPlace = {
	render: () => (
		<Hold shape={<Button>Save order</Button>}>
			<span className="sp-row-flex sp-gap-8"><Spinner /><span className="sp-subtitle">Saving</span></span>
		</Hold>
	)
}

export const Keys = {
	render: () => (
		<div className="sp-stack sp-gap-8">
			<span className="sp-row-flex sp-gap-8"><Kbd>S</Kbd><span className="sp-subtitle">focuses the search</span></span>
			<span className="sp-row-flex sp-gap-8"><Kbd>N</Kbd><span className="sp-subtitle">starts an order</span></span>
			<span className="sp-row-flex sp-gap-8"><Kbd accent>?</Kbd><span className="sp-subtitle">lists every shortcut</span></span>
		</div>
	)
}

export const HiddenAmount = { render: () => <span className="sp-row-flex sp-gap-8"><span className="sp-subtitle">Spent this month</span><Redacted /></span> }

export const AddARow = { render: () => <div style={{ maxWidth: 360 }}><AddRow onClick={() => {}}>Add a line</AddRow></div> }
