import { CardBody, CardDivider, CardHeader, DashboardCards, EntryRow, SummaryRow } from 'spendly-react'

// Home's dashboard: the catalogue of cards that exist, which of them this account has on, and
// a render function that fills the card the component draws around each key.
const wide: React.CSSProperties = { width: 640 }

const catalogue = [
	{ key: 'spending_rhythm', name: 'Spending rhythm', desc: 'Average order, and which weekday you spend on' },
	{ key: 'category_breakdown', name: 'Category breakdown', desc: "Where this month's spend went, by category" },
	{ key: 'top_vendors', name: 'Top vendors', desc: 'The shops you spend the most at, all time' },
	{ key: 'top_categories', name: 'Top categories', desc: 'The kinds of thing you spend the most on, all time' },
	{ key: 'saved_vs_retail', name: 'Saved vs retail', desc: 'What you paid against the retail price, this month' }
]

const bilka = { colour: '#1F6FEB', initials: 'BI' }
const netto = { colour: '#F4C025', initials: 'NE' }

const body = (key: string) => {
	if (key === 'spending_rhythm') return (
		<>
			<CardHeader title="Spending rhythm" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Average order" value="367 kr." />
				<SummaryRow label="Busiest day" value="Saturday" />
			</CardBody>
		</>
	)
	if (key === 'category_breakdown') return (
		<>
			<CardHeader title="Category breakdown" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Groceries" value="6.140 kr." />
				<SummaryRow label="Household" value="2.905 kr." />
			</CardBody>
		</>
	)
	if (key === 'top_vendors') return (
		<>
			<CardHeader title="Top vendors" to="/vendors" label="Top vendors, open Vendors" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow avatar={bilka} name="Bilka" meta="18 orders" amount="14.902 kr." to="/vendors/1" />
				<EntryRow avatar={netto} name="Netto" meta="11 orders" amount="3.480 kr." to="/vendors/2" />
			</CardBody>
		</>
	)
	return (
		<>
			<CardHeader title="Saved vs retail" />
			<CardDivider />
			<CardBody variant="card-body-page">
				<SummaryRow label="Paid" value="12.480 kr." />
				<SummaryRow label="Retail" value="14.445 kr." />
			</CardBody>
		</>
	)
}

export const Dashboard = () => (
	<div style={wide}>
		<DashboardCards all={catalogue} initial={['spending_rhythm', 'category_breakdown', 'top_vendors', 'saved_vs_retail']}
			render={body} />
	</div>
)

export const NoCardsChosen = () => (
	<div style={wide}>
		<DashboardCards all={catalogue} initial={[]} render={body} />
	</div>
)
