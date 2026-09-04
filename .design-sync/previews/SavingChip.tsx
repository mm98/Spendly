import { Card, CardBody, CardDivider, CardHeader, SavingChip } from 'spendly-react'

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }

/* Home's "Saved vs retail" card: the figure, what it is, then the chip that says how far
   under retail that figure got. */
export const SavedVsRetail = () => (
	<Card>
		<CardHeader title="Saved vs retail" />
		<CardDivider />
		<CardBody>
			<div className="figure-card tabular-figures">1.965 kr.</div>
			<span className="card-caption">saved this month</span>
			<div style={{ marginTop: 10 }}>
				<SavingChip>13,6% under retail</SavingChip>
			</div>
		</CardBody>
	</Card>
)

/* The same chip beside a caption instead of under a figure, which is how the savings-growth
   card carries it: the number alone, pushed to the end of the line. */
export const BesideACaption = () => (
	<Card>
		<CardHeader title="Savings growth" />
		<CardDivider />
		<CardBody>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
				<div>
					<div className="card-caption">Total saved</div>
					<span className="figure-card tabular-figures">1.965 kr.</span>
				</div>
				<SavingChip>13,6%</SavingChip>
			</div>
		</CardBody>
	</Card>
)

/* Whatever is passed is what is printed: the chip formats nothing and always reads as a
   gain, so only send it a figure that is one. */
export const Values = () => (
	<div style={row}>
		<SavingChip>13,6% under retail</SavingChip>
		<SavingChip>31,4%</SavingChip>
		<SavingChip>412 kr. under retail</SavingChip>
	</div>
)
