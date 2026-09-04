import { Card, CardBody, CardDivider, CardHeader, SummaryRow, SummaryTotal } from 'spendly-react'

/* One line of a summary panel: a label on the left, a figure on the right in the tabular
   face, so the figures line up down the card. It is the arithmetic under an item list and
   the fact list in an order's Details rail. */

export const OrderArithmetic = () => (
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
			<span className="field-help summary-saved">saved 241,40 kr. vs retail (16,7%)</span>
		</CardBody>
	</Card>
)

/* The Details rail on an order: every fact about the record, one row each. */
export const DetailsRail = () => (
	<Card aria-label="Details">
		<CardHeader title="Details" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<SummaryRow label="Status" value="Delivered" />
			<SummaryRow label="Date" value="02.09.2026" />
			<SummaryRow label="Ordered" value="29.08.2026" />
			<SummaryRow label="Delivered" value="02.09.2026" />
			<SummaryRow label="Vendor" value="Bilka" />
			<SummaryRow label="Categories" value="Groceries, Household" />
			<SummaryRow label="Kind" value="Expense" />
			<SummaryRow label="Reference" value="1042" />
		</CardBody>
	</Card>
)

/* A form's rail reads the draft, so it draws the same rows over numbers nothing has saved
   yet. `className` is where a row takes an extra modifier, e.g. a saving painted green. */
export const DraftRail = () => (
	<Card aria-label="Order summary">
		<CardBody>
			<div className="card-subheading">Order summary</div>
			<span className="section-label">Order details</span>
			<SummaryRow label="Vendor" value="Netto" />
			<SummaryRow label="Date" value="04.09.2026" />
			<SummaryRow label="Status" value="Ordered" />
			<SummaryRow label="Categories" value="Groceries" />
			<SummaryRow label="Kind" value="Expense" />
			<SummaryRow label="Items" value="318,95 kr." />
			<SummaryRow label="Shipping" value="0,00 kr." />
			<CardDivider className="card-divider-tight" />
			<SummaryTotal label="Estimated total" value="318,95 kr." estimate />
		</CardBody>
	</Card>
)
