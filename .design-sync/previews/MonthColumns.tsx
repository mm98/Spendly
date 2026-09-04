import { Card, CardBody, CardDivider, CardHeader, MonthColumns } from 'spendly-react'

/* One column per window, on the same fixed 0-100 scale WeekdayBars uses: `height` is a
   percentage of the tallest column, not a pixel figure, so the chart fills whatever card it is
   put in. The window on screen is the only green column; the rest are the track grey. The kr
   amount is in the tooltip.

   The label pair is the whole reason both `label` and `labelFull` are sent: the chart is its
   own container and prints the full form only where there is room for it. */

const columns = (rows: { label: string; labelFull: string; spend: number; current?: boolean }[]) => {
	const most = Math.max(...rows.map(r => r.spend))
	return rows.map(r => ({ ...r, current: !!r.current, height: most ? Math.round((r.spend / most) * 100) : 0 }))
}

/* Statistics' recent-windows card at Month width. `card-body-fill` makes the columns take the
   card's leftover height -- this card shares a row with the category breakdown, which is as
   long as the account has categories. */
export const LastSixMonths = () => (
	<Card aria-label="Last six months">
		<CardHeader title="Last six months">
			<span className="field-help">December is the highest</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-fill">
			<MonthColumns months={columns([
				{ label: 'Dec', labelFull: 'December', spend: 18465 },
				{ label: 'Jan', labelFull: 'January', spend: 9840 },
				{ label: 'Feb', labelFull: 'February', spend: 8120 },
				{ label: 'Mar', labelFull: 'March', spend: 11231 },
				{ label: 'Apr', labelFull: 'April', spend: 11786 },
				{ label: 'May', labelFull: 'May', spend: 6325, current: true }
			])} />
		</CardBody>
	</Card>
)

/* The same card at Week width -- the picker and the chart move together, so Week draws six
   weeks here, not six months. A week's short and full labels are the same string, so nothing
   swaps as the card narrows. */
export const LastSixWeeks = () => (
	<Card aria-label="Last six weeks">
		<CardHeader title="Last six weeks">
			<span className="field-help">Week 17 is the highest</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-fill">
			<MonthColumns months={columns([
				{ label: 'Week 14', labelFull: 'Week 14', spend: 2140 },
				{ label: 'Week 15', labelFull: 'Week 15', spend: 3480 },
				{ label: 'Week 16', labelFull: 'Week 16', spend: 1290 },
				{ label: 'Week 17', labelFull: 'Week 17', spend: 4025 },
				{ label: 'Week 18', labelFull: 'Week 18', spend: 2870 },
				{ label: 'Week 19', labelFull: 'Week 19', spend: 1560, current: true }
			])} />
		</CardBody>
	</Card>
)

/* And at Quarter width. The current window is the one still being written, so its column is
   short and green -- a low green column is a quarter three weeks in, not a quiet one. */
export const LastSixQuarters = () => (
	<Card aria-label="Last six quarters">
		<CardHeader title="Last six quarters">
			<span className="field-help">Q4 2023 is the highest</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-fill">
			<MonthColumns months={columns([
				{ label: 'Q1 2023', labelFull: 'Q1 2023', spend: 29390 },
				{ label: 'Q2 2023', labelFull: 'Q2 2023', spend: 32515 },
				{ label: 'Q3 2023', labelFull: 'Q3 2023', spend: 36440 },
				{ label: 'Q4 2023', labelFull: 'Q4 2023', spend: 46240 },
				{ label: 'Q1 2024', labelFull: 'Q1 2024', spend: 31857 },
				{ label: 'Q2 2024', labelFull: 'Q2 2024', spend: 6325, current: true }
			])} />
		</CardBody>
	</Card>
)
