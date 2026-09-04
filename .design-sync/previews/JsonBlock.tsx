import { Card, CardBody, JsonBlock } from 'spendly-react'

// Settings > Import draws these inside a page card body, one block per request or response,
// with the prose that explains each one underneath it.
const side: React.CSSProperties = { width: 560 }

const importRequest = {
	orders: [{
		vendor: 'Bilka', date: '2024-04-18', kind: 'Expense', status: 'Delivered',
		deliveredDate: '2024-04-20', categories: ['Groceries'], shipping: 0, discount: 10.00,
		items: [{ title: 'Rugbrød', quantity: 1, price: 24.95, retail: 32.00 }],
		attachments: [{ filename: 'kvittering.pdf', contentType: 'application/pdf', data: '<base64>' }]
	}]
}

const importResponse = { imported: 1, orders: ['o-4c81f0a92d7b6e35'], failed: [{ index: 3, error: '...' }] }

const scanRead = {
	vendor: 'Netto', vendorMatched: true, date: '2024-05-02', total: 268.45,
	linesRead: 3, shipping: 0, discount: 0,
	lines: [
		{ title: 'Skummetmælk 1 l', quantity: 2, price: 9.95 },
		{ title: 'Rugbrød', quantity: 1, price: 24.95 },
		{ title: 'Kaffe 400 g', quantity: 1, price: 49.95 }
	]
}

export const ImportRequest = () => (
	<div style={side}>
		<Card aria-label="Import from another system">
			<CardBody variant="card-body-page">
				<div className="card-headline">Import from another system</div>
				<p className="card-lead">Bring orders in from another expense tracker.</p>
				<JsonBlock value={importRequest} label="Import request shape" />
			</CardBody>
		</Card>
	</div>
)

export const ImportResponse = () => (
	<div style={side}>
		<Card aria-label="Import from another system">
			<CardBody variant="card-body-page">
				<JsonBlock value={importResponse} label="Import response shape" />
				<span className="field-help">
					Each order imports on its own, so one bad row fails alone: the response names every
					failure by its place in the list.
				</span>
			</CardBody>
		</Card>
	</div>
)

export const WhatAScanRead = () => (
	<div style={side}>
		<Card aria-label="What Spendly read">
			<CardBody variant="card-body-page">
				<JsonBlock value={scanRead} label="What Spendly read from the file" />
			</CardBody>
		</Card>
	</div>
)
