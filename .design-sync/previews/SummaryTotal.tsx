import { Card, CardBody, CardDivider, CardHeader, SummaryTotal, SummaryRow } from 'spendly-react'

/* The bottom line of a summary panel, one step larger and heavier than the SummaryRows
   above it. It always follows a tight divider, which is what separates the parts from the
   sum. `label` defaults to "Total". */

export const UnderTheItems = () => (
	<Card aria-label="Items">
		<CardHeader title="Items • 5">
			<span className="field-help tabular-figures">1.284,50 kr.</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<SummaryRow label="Items subtotal" value="1.284,50 kr." />
			<SummaryRow label="Discount" value="-120,00 kr." />
			<SummaryRow label="Shipping" value="39,00 kr." />
			<CardDivider className="card-divider-tight" />
			<SummaryTotal value="1.203,50 kr." />
		</CardBody>
	</Card>
)

/* `estimate` marks a total that is still being built -- a wizard's rail, where nothing has
   been saved and adding one more line changes the figure. Name it in the label as well, so
   the row says in words what the styling says. */
export const StillBeingBuilt = () => (
	<Card aria-label="Order summary">
		<CardBody>
			<div className="card-subheading">Order summary</div>
			<span className="section-label">Order details</span>
			<SummaryRow label="Items" value="742,45 kr." />
			<SummaryRow label="Discount" value="-38,50 kr." />
			<SummaryRow label="Shipping" value="29,00 kr." />
			<CardDivider className="card-divider-tight" />
			<SummaryTotal label="Estimated total" value="732,95 kr." estimate />
			<span className="field-help">Items are added in step 2; the total builds as you add them.</span>
		</CardBody>
	</Card>
)

/* The two side by side: the same figure, settled and unsettled. */
export const SettledAndEstimated = () => (
	<Card aria-label="Totals">
		<CardHeader title="Totals" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<SummaryTotal value="1.203,50 kr." />
			<SummaryTotal label="Estimated total" value="1.203,50 kr." estimate />
		</CardBody>
	</Card>
)
