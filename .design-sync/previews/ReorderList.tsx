import { useState } from 'react';
import { ReorderList, ListItem, Mark, Icon, Pill } from 'spendly-react';

const ACCOUNTS = [
	{ id: 'a', name: 'Housing', through: 'Rent and utilities' },
	{ id: 'b', name: 'Food', through: 'Bilka, Netto, Lidl' },
	{ id: 'c', name: 'Transport', through: 'Rejsekort, fuel' },
	{ id: 'd', name: 'Savings', through: 'Monthly transfer' }
];

export const Accounts = () => {
	const [list, setList] = useState(ACCOUNTS);
	return (
		<div className="sp-stack sp-gap-8" style={{ maxWidth: 420 }}>
			<ReorderList items={list} keyOf={a => a.id} nameOf={a => a.name} onMove={next => setList(next)}>
				{a => (
					<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${a.name}`}>
						<span className="sp-stacked sp-grow">
							<span className="sp-title sp-truncate">{a.name}</span>
							<span className="sp-subtitle">{a.through}</span>
						</span>
					</ListItem>
				)}
			</ReorderList>
		</div>
	);
};

const LINES = [
	{ key: 1, title: 'Lounge chair, oak', price: '2 × 4.310,00 kr.' },
	{ key: 2, title: 'Side table', price: '1 × 1.295,00 kr.' },
	{ key: 3, title: 'Floor lamp, brass', price: '1 × 899,00 kr.' }
];

export const OrderLines = () => {
	const [lines, setLines] = useState(LINES);
	return (
		<div className="sp-stack sp-gap-8" style={{ maxWidth: 420 }}>
			<ReorderList items={lines} keyOf={l => l.key} nameOf={l => l.title} onMove={next => setLines(next)}>
				{l => (
					<ListItem handle={<Icon name="grip-vertical" />} handleLabel={`Move ${l.title}`} mark={<Mark size="medium" fill="empty" aria-label="No photo yet" />}>
						<div className="sp-stack">
							<span className="sp-data">{l.title}</span>
							<span className="sp-subtitle">{l.price}</span>
						</div>
					</ListItem>
				)}
			</ReorderList>
		</div>
	);
};

const STATUSES = [
	{ key: 'ordered', name: 'Ordered', tone: 'default' },
	{ key: 'delivered', name: 'Delivered', tone: 'success' },
	{ key: 'cancelled', name: 'Cancelled', tone: 'danger' }
];

export const Statuses = () => {
	const [list, setList] = useState(STATUSES);
	return (
		<div className="sp-stack sp-gap-6" style={{ maxWidth: 420 }}>
			<ReorderList items={list} keyOf={s => s.key} nameOf={s => s.name} onMove={next => setList(next)}>
				{s => (
					<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${s.name}`}>
						<span className="sp-grow"><Pill color={s.tone}>{s.name}</Pill></span>
					</ListItem>
				)}
			</ReorderList>
		</div>
	);
};
