import { Button, Card, CardHeader, CardBody, Cards, Icon, Pill, Segmented } from 'spendly-react';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' } as const;

export const Headers = () => (
	<div style={grid}>
		<Card>
			<CardHeader name="Drafts" meta="newest 3" actions={[{ label: 'All 5', to: '/orders' }]} />
			<span className="sp-data">Indbo Møbler · 19/08</span>
		</Card>
		<Card>
			<CardHeader name="Top vendors" aside="August · top 8 of 10" />
			<span className="sp-data">Indbo Møbler · 24.310 kr.</span>
		</Card>
		<Card>
			<CardHeader name="Items · 2" aside="1 line needs attention" asideTone="danger" />
			<span className="sp-data">Lounge chair · 2 × 4.129,00</span>
		</Card>
		<Card>
			<CardHeader name="Spend, August" status={<Pill color="danger">2.100 over</Pill>} />
			<span className="sp-stat__figure">24.100 kr.</span>
		</Card>
		<Card>
			<CardHeader name="Spend by month" control={<Segmented name="card-head" options={[{ value: 's', label: 'Stacked' }, { value: 't', label: 'Total' }]} defaultValue="s" />} />
			<span className="sp-data">Jan to Aug</span>
		</Card>
		<Card>
			<CardHeader name="August 2026" onDismiss={() => {}} dismissLabel="Hide the August summary" />
			<span className="sp-data">61.480 kr. across 18 orders</span>
		</Card>
	</div>
);

export const Footers = () => (
	<div style={grid}>
		<Card footer={<Button>Save</Button>}>
			<span className="sp-title">Budget for August</span>
			<span className="sp-subtitle">One action fills the footer.</span>
		</Card>
		<Card footerLayout="split" footerCommits footer={[<Button key="c" variant="text">Cancel</Button>, <Button key="s">Save</Button>]}>
			<span className="sp-title">Edit vendor</span>
			<span className="sp-subtitle">Two actions share the footer in equal halves.</span>
		</Card>
		<Card variant="flush">
			<CardBody>
				<div className="sp-stacked">
					<span className="sp-title">Flush</span>
					<span className="sp-subtitle">No padding of its own: the content owns it, as a table or an image needs.</span>
				</div>
			</CardBody>
		</Card>
	</div>
);

export const ColorsAndLinks = () => (
	<Cards>
		<Card variant="shell">
			<span className="sp-section-label">August</span>
			<span className="sp-stat__figure">61.480,00 kr.</span>
			<span className="sp-meta">Across 18 orders</span>
		</Card>
		<Card to="/orders" chevron={<Icon name="chevron-right" />}>
			<span className="sp-title">Orders this month</span>
			<span className="sp-subtitle">The whole card is the link.</span>
		</Card>
		<Card color="warning">
			<span className="sp-title">Decor is over its limit</span>
			<span className="sp-subtitle">24.100 of 22.000 kr. for August.</span>
		</Card>
		<Card color="danger">
			<span className="sp-title">The import failed</span>
			<span className="sp-subtitle">Two rows have no price.</span>
		</Card>
	</Cards>
);
