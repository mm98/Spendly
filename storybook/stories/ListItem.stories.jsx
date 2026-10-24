import { ListItem, ListItemHead } from '../../react/src/components/ListItem.jsx'
import { Card } from '../../react/src/components/Card.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'

const CHEVRON = <Icon name="chevron-right" />

export default {
	title: 'Lists/List item',
	component: ListItem,
	decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>]
}

export const Rows = {
	render: () => (
		<Card variant="flush">
			<ListItemHead label="Furniture" amount="24.310,00 kr." />
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
	render: () => (
		<Card variant="flush">
			{['Havemøbler', 'Boligtilbehør', 'Belysning'].map(name => (
				<ListItem key={name} handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${name}`}
					actions={<IconButton icon="pencil" aria-label={`Rename ${name}`} />}>
					<span className="sp-title sp-grow sp-truncate">{name}</span>
				</ListItem>
			))}
			<ListItem variant="add" handle onClick={() => {}}><Icon name="plus" size={14} /><span>Add a category</span></ListItem>
		</Card>
	)
}

export const StickySaveBar = {
	render: () => (
		<ListItem variant="sticky">
			<Stacked>
				<span className="sp-subtitle">Total</span>
				<span className="sp-amount">3.980,00 kr.</span>
			</Stacked>
			<span className="sp-grow" />
			<Button variant="text">Discard</Button>
			<Button>Save order</Button>
		</ListItem>
	)
}
