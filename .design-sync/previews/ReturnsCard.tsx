import { ReturnsCard } from 'spendly-react'

// The card sits in the orders column on Orders and in the side column on Statistics.
const column: React.CSSProperties = { width: 420 }

const bilka = { name: 'Bilka', colour: '#1F6FEB', initials: 'BI' }
const elgiganten = { name: 'Elgiganten', colour: '#0E7A5F', initials: 'EL' }
const matas = { name: 'Matas', colour: '#8A4FD3', initials: 'MA' }

export const WithMoreBehindIt = () => (
	<div style={column}>
		<ReturnsCard title="Returns • August 2026" span="August"
			returns={{
				total: 9,
				history: 41,
				items: [
					{ id: 11, vendor: elgiganten, date: '2026-08-22', refunded: true, total: 1899, saved: 200 },
					{ id: 12, vendor: bilka, date: '2026-08-14', refunded: false, total: 249, saved: 18 },
					{ id: 13, vendor: matas, date: '2026-08-03', refunded: true, total: 138, saved: 12 }
				]
			}} />
	</div>
)

export const AllOfThemShown = () => (
	<div style={column}>
		<ReturnsCard title="Returns • August 2026" span="August"
			returns={{
				total: 2,
				history: 15,
				items: [
					{ id: 21, vendor: bilka, date: '2026-08-14', refunded: false, total: 249, saved: 18 },
					{ id: 22, vendor: matas, date: '2026-08-03', refunded: true, total: 138, saved: 12 }
				]
			}} />
	</div>
)

export const NoneInTheWindow = () => (
	<div style={column}>
		<ReturnsCard title="Returns • August 2026" span="August"
			returns={{ total: 0, history: 15, items: [] }} />
	</div>
)

export const NoneEver = () => (
	<div style={column}>
		<ReturnsCard title="Returns • August 2026" span="August"
			returns={{ total: 0, history: 0, items: [] }} />
	</div>
)
