import { Card, CardBody, CardDivider, CardHeader, EntryRow, SectionLabel, Sep } from 'spendly-react'

/* Where it earns its place: the second line of a row, holding three facts apart. */
export const InARowMeta = () => (
	<Card>
		<CardHeader title="Latest orders" />
		<CardDivider />
		<CardBody variant="entry-list card-body-tight">
			<EntryRow avatar={{ colour: 'var(--donut-blue)', initials: 'BI' }} name="Bilka"
				meta={<>4 September<Sep />12 items<Sep />Groceries, Household</>}
				amount="1.284,50 kr." />
			<EntryRow avatar={{ colour: 'var(--donut-orange)', initials: 'NE' }} name="Netto"
				meta={<>2 September<Sep />7 items<Sep />Groceries</>}
				amount="342,95 kr." />
		</CardBody>
	</Card>
)

/* A count joined to the label it counts, and a pair of key hints on one line. */
export const InALabel = () => (
	<div style={{ display: 'grid', gap: 10 }}>
		<SectionLabel>Lines read<Sep />18</SectionLabel>
		<span className="field-help">Enter saves<Sep />Escape cancels</span>
	</div>
)

/* Two values with nothing between them but the separator, which is the whole component. */
export const BetweenTwoValues = () => (
	<div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
		<span>Spendly<Sep />your spending</span>
		<span>Lighthouse 12.2.1<Sep />FCP 412 ms</span>
	</div>
)
