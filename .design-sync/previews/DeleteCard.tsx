import { Button, DeleteCard } from 'spendly-react'

// `del` comes from the `useDelete` hook on the page. A still preview passes the same shape by
// hand: the button it renders, and no open dialog.
const side: React.CSSProperties = { width: 340 }

const del = (what: string) => ({
	confirming: false,
	button: <Button variant="block" icon="trash">DELETE {what.toUpperCase()}</Button>,
	dialog: null
})

export const DeleteVendor = () => (
	<div style={side}>
		<DeleteCard what="vendor" del={del('vendor')}>
			A vendor that still has orders on it cannot be removed: the orders would point at nothing.
		</DeleteCard>
	</div>
)

export const DeleteCategory = () => (
	<div style={side}>
		<DeleteCard what="category" del={del('category')}>
			Removing a category does not remove its orders. A category still used by an order
			cannot be removed.
		</DeleteCard>
	</div>
)

export const DeleteWish = () => (
	<div style={side}>
		<DeleteCard what="wish" del={del('wish')}>
			Nothing else points at a wish, so removing one takes only the wish itself. To keep it
			without it being on your list, archive it instead.
		</DeleteCard>
	</div>
)
