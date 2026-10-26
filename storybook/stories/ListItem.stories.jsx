import { ListItem, ListItemHead } from '../../react/src/components/ListItem.jsx'
import { Card } from '../../react/src/components/Card.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'
import { expect, fn, userEvent } from 'storybook/test'

const CHEVRON = <Icon name="chevron-right" />
// a handle is a drawn part, so the story offers it by name
const handleControl = (size = 14) => ({ control: 'select', options: ['none', 'grip'], mapping: { none: undefined, grip: <Icon name="grip-vertical" size={size} /> } })

export default {
	title: 'Lists/List item',
	component: ListItem,
	subcomponents: { ListItemHead },
	decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>],
	argTypes: { mark: { control: false }, handle: { control: false }, actions: { control: false }, children: { control: false } }
}

export const OneRow = {
	args: { variant: 'default', color: 'default', name: 'Indbo Møbler', reference: 'SPENDLY-441', amount: '3.980,00', count: undefined, opens: true, editable: false, handle: 'none', handleLabel: 'Move Indbo Møbler', onClick: fn() },
	argTypes: { name: { control: 'text', description: 'The row\'s title' }, reference: { control: 'text', description: 'Its second line' }, amount: { control: 'text', description: 'The amount at its end' }, handle: handleControl() },
	render: ({ name, reference, amount, ...args }) => (
		<Card variant="flush">
			<ListItem {...args} mark={<Mark size="medium" fill="solid">{name}</Mark>} chevron={CHEVRON}>
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-subtitle">{reference}</span>
				</Stacked>
				<span className="sp-grow" />
				<span className="sp-amount">{amount}</span>
			</ListItem>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('SPENDLY-441'))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}

export const Rows = {
	args: { label: 'Furniture', amount: '24.310,00 kr.' },
	argTypes: { label: { control: 'text', description: 'ListItemHead\'s label' }, amount: { control: 'text', description: 'ListItemHead\'s amount' } },
	render: ({ label, amount: total }) => (
		<Card variant="flush">
			<ListItemHead label={label} amount={total} />
			{[['Indbo Møbler', 'SPENDLY-441', '3.980,00'], ['HAY', 'SPENDLY-438', '890,00'], ['Muuto', 'SPENDLY-432', '1.240,00']].map(([name, ref, amount]) => (
				<ListItem key={ref} mark={<Mark size="medium" fill="solid">{name}</Mark>} chevron={CHEVRON} to="/orders">
					<Stacked>
						<span className="sp-title sp-truncate">{name}</span>
						<span className="sp-subtitle">{ref}</span>
					</Stacked>
					<span className="sp-grow" />
					<span className="sp-amount">{amount}</span>
				</ListItem>
			))}
		</Card>
	)
}

export const Attention = {
	render: () => (
		<Card variant="flush">
			<ListItem color="danger" count={2} chevron={CHEVRON} to="/categories"><span className="sp-grow sp-truncate">categories are over their limit</span></ListItem>
			<ListItem color="warning" count={4} chevron={CHEVRON} to="/orders"><span className="sp-grow sp-truncate">orders have no receipt</span></ListItem>
			<ListItem color="success" chevron={CHEVRON} to="/orders"><span className="sp-grow sp-truncate">Every order this month is approved</span></ListItem>
		</Card>
	)
}

export const WithActionsAndHandle = {
	args: { onRename: fn(), onAdd: fn() },
	render: ({ onRename, onAdd }) => (
		<Card variant="flush">
			{['Havemøbler', 'Boligtilbehør', 'Belysning'].map(name => (
				<ListItem key={name} handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${name}`}
					actions={<IconButton icon="pencil" aria-label={`Rename ${name}`} onClick={() => onRename(name)} />}>
					<span className="sp-title sp-grow sp-truncate">{name}</span>
				</ListItem>
			))}
			<ListItem variant="add" handle onClick={onAdd}><Icon name="plus" size={14} /><span>Add a category</span></ListItem>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Rename Belysning' }))
		await expect(args.onRename).toHaveBeenCalledWith('Belysning')
	}
}

// a row that opens and also moves: the handle and the open target side by side, never one inside the other
export const OpensAndMoves = {
	args: { onOpen: fn(), onRename: fn() },
	render: ({ onOpen, onRename }) => (
		<Card variant="flush">
			{['Havemøbler', 'Boligtilbehør', 'Belysning'].map(name => (
				<ListItem key={name} opens handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${name}`} onClick={() => onOpen(name)}
					actions={<IconButton icon="pencil" aria-label={`Rename ${name}`} onClick={() => onRename(name)} />}>
					<span className="sp-title sp-grow sp-truncate">{name}</span>
				</ListItem>
			))}
		</Card>
	),
	play: async ({ args, canvas, canvasElement }) => {
		await expect(canvasElement.querySelector('button button, a button')).toBeNull()
		await userEvent.click(canvas.getByText('Belysning'))
		await expect(args.onOpen).toHaveBeenCalledWith('Belysning')
		await userEvent.click(canvas.getByRole('button', { name: 'Rename Belysning' }))
		await expect(args.onRename).toHaveBeenCalledWith('Belysning')
		await expect(args.onOpen).toHaveBeenCalledOnce()
		await userEvent.click(canvas.getByRole('button', { name: 'Move Havemøbler' }))
		await expect(args.onOpen).toHaveBeenCalledOnce()
	}
}

export const StickySaveBar = {
	args: { total: '3.980,00 kr.', onSave: fn(), onDiscard: fn() },
	argTypes: { total: { control: 'text', description: 'The total the bar shows' } },
	render: ({ total, onSave, onDiscard }) => (
		<ListItem variant="sticky">
			<Stacked>
				<span className="sp-subtitle">Total</span>
				<span className="sp-amount">{total}</span>
			</Stacked>
			<span className="sp-grow" />
			<Button variant="text" onClick={onDiscard}>Discard</Button>
			<Button onClick={onSave}>Save order</Button>
		</ListItem>
	)
}

export const WithAControlBeside = {
	args: { name: 'Arla Letmælk 1 L', meta: '2 × 13,95 kr.', amount: '27,90', onClick: fn(), onTag: fn() },
	argTypes: { name: { control: 'text', description: 'The line\'s name' }, meta: { control: 'text', description: 'Its second line' }, amount: { control: 'text', description: 'The amount at its end' } },
	render: ({ name, meta, amount, onClick, onTag }) => (
		<Card variant="flush">
			<ListItem onClick={onClick} mark={<Mark size="medium" fill="empty" aria-label="No photo"><Icon name="photo" /></Mark>}
				control={<IconButton size="small" icon="tag" aria-label="Offer at Netto" onClick={onTag} />}
				end={<span className="sp-amount">{amount}</span>}>
				<Stacked>
					<span className="sp-title sp-truncate">{name}</span>
					<span className="sp-subtitle">{meta}</span>
				</Stacked>
				<span className="sp-grow" />
			</ListItem>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Offer at Netto' }))
		await expect(args.onTag).toHaveBeenCalledOnce()
		await expect(args.onClick).not.toHaveBeenCalled()
		await userEvent.click(canvas.getByText(args.name))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}
