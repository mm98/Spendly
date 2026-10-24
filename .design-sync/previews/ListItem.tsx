import { ListItem, ListItemRemove, Insertion, Announce, Mark, Stacked, Line, Pill, Icon, IconButton, Button } from 'spendly-react';

const col = { display: 'grid', gap: 8, maxWidth: 420 } as const;

export const Variants = () => (
	<div style={col}>
		<ListItem mark={<Mark size="small" fill="solid">Indbo Møbler</Mark>} count={4}><span className="sp-data">Orders waiting for a receipt</span></ListItem>
		<ListItem variant="outline" selected chevron={<Icon name="chevron-right" />} onClick={() => {}}><span className="sp-data">Indbo Møbler</span></ListItem>
		<ListItem variant="primary"><span className="sp-data">Furniture · 24.310 kr.</span></ListItem>
		<ListItem variant="stack">
			<span className="sp-data">Delivery address</span>
			<span className="sp-subtitle">Two lines rather than a row.</span>
		</ListItem>
	</div>
);

export const Colors = () => (
	<div style={col}>
		<ListItem color="warning" count={2}><span className="sp-data">Decor is near its limit</span></ListItem>
		<ListItem color="danger"><span className="sp-data">Two lines have no price</span></ListItem>
		<ListItem color="success"><span className="sp-data">All receipts are attached</span></ListItem>
	</div>
);

export const Cards = () => (
	<div style={col}>
		<ListItem variant="card" mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>} onClick={() => {}}>
			<Stacked>
				<Line>
					<span className="sp-title sp-truncate">Indbo Møbler</span>
					<span className="sp-grow" />
					<span className="sp-amount">4.310,00</span>
				</Line>
				<Line>
					<span className="sp-meta">SPENDLY-447 · 08/08/2026</span>
					<span className="sp-grow" />
					<Pill color="success">Approved</Pill>
				</Line>
			</Stacked>
		</ListItem>
		<ListItem variant="card" selected mark={<Mark size="medium" fill="solid">HAY</Mark>} onClick={() => {}}>
			<Stacked>
				<Line>
					<span className="sp-title sp-truncate">HAY</span>
					<span className="sp-grow" />
					<span className="sp-amount">890,00</span>
				</Line>
				<Line><span className="sp-meta">Selected</span></Line>
			</Stacked>
		</ListItem>
	</div>
);

export const Reorder = () => (
	<div className="sp-stack sp-gap-8" style={{ maxWidth: 420 }}>
		<ListItem
			handle={<Icon name="grip-vertical" />}
			handleLabel="Move Lounge chair, oak"
			mark={<Mark size="medium" fill="empty" aria-label="No photo yet" />}
			actions={<ListItemRemove><IconButton icon="trash" aria-label="Remove line" size="small" /></ListItemRemove>}
		>
			<div className="sp-stack">
				<span className="sp-data">Lounge chair, oak</span>
				<span className="sp-subtitle">2 × 4.310,00 kr.</span>
			</div>
		</ListItem>
		<Insertion />
		<ListItem color="warning" handle={<Icon name="grip-vertical" />} handleLabel="Move Side table" mark={<Mark size="medium" fill="empty" aria-label="No photo yet" />}>
			<div className="sp-stack">
				<span className="sp-data">Side table</span>
				<span className="sp-subtitle">No amount yet.</span>
			</div>
		</ListItem>
		<ListItem variant="carried" handle={<Icon name="grip-vertical" />}><span className="sp-data">Floor lamp, brass</span></ListItem>
		<ListItem variant="add" handle={<Icon name="grip-vertical" />} mark={<Mark size="medium" fill="add" aria-label="Add a line">+</Mark>}>
			<span className="sp-title">Add line</span>
		</ListItem>
		<Announce>Lounge chair, oak moved to position 1 of 3</Announce>
	</div>
);

export const SaveBar = () => (
	<div style={{ maxWidth: 520 }}>
		<ListItem variant="sticky">
			<Stacked>
				<span className="sp-subtitle">Total</span>
				<span className="sp-amount">3.980,00 kr.</span>
			</Stacked>
			<span className="sp-grow" />
			<Button variant="text">Discard</Button>
			<Button>Save order</Button>
		</ListItem>
	</div>
);
