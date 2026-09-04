import { JsonDialog } from 'spendly-react'

// The dialog opens itself with showModal(), so it paints in the top layer over the whole
// viewport -- each cell here is the open dialog and its backdrop. Scan's review screen is
// the only caller: the DETAILS button hands it the whole draft the review was built from.

const scanDraft = {
	documentKey: 'u-9d41b7c05ea2f836',
	file: { key: 'u-9d41b7c05ea2f836', name: 'bilka-18-04-2024.pdf', kind: 'pdf', hasThumbnail: false, meta: 'PDF • 412 kB' },
	vendor: 'Bilka', vendorMatched: true,
	date: '2024-04-18', status: 'Delivered', kind: 'Expense',
	shipping: 0, discount: 10.00, linesRead: 4, total: 1284.00,
	lines: [
		{ id: 'l-1a2b3c4d5e6f7081', title: 'Rugbrød', quantity: 1, price: 24.95 },
		{ id: 'l-2b3c4d5e6f708192', title: 'Skummetmælk 1 l', quantity: 6, price: 9.95 },
		{ id: 'l-3c4d5e6f708192a3', title: 'Kaffe 400 g', quantity: 2, price: 49.95 },
		{ id: 'l-4d5e6f708192a3b4', title: 'Vaskepulver 1,1 kg', quantity: 1, price: 89.00, uncertain: true }
	],
	reconciled: 'Matched against the document’s own printed total.',
	checks: [
		{ id: 'vendor', warning: false, title: 'Matched to Bilka', meta: 'BILKA' },
		{ id: 'total', warning: false, title: 'Printed total found' },
		{ id: 'vat', warning: false, title: 'Prices already included VAT' }
	],
	duplicate: null
}

const orderRecord = {
	id: 'o-4c81f0a92d7b6e35',
	vendor: 'Matas', date: '2024-03-11', status: 'Delivered',
	total: 349.50, saved: 42.00, itemCount: 3
}

export const WhatSpendlyReadFromTheFile = () => (
	<JsonDialog value={scanDraft} title="What Spendly read from the file" onClose={() => {}} />
)

export const AShortRecord = () => (
	<JsonDialog value={orderRecord} title="What Spendly read from the file" onClose={() => {}} />
)
