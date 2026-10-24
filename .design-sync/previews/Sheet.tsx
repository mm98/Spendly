import { Button, Card, Choice, FieldGroup, Radio, Scrim, Sheet } from 'spendly-react';

export const OverAPage = () => (
	<div className="sp-phone sp-touch">
		<Card>
			<span className="sp-title">Indbo Møbler</span>
			<span className="sp-subtitle">SPENDLY-447 · 24.310,00 kr.</span>
		</Card>
		<Card>
			<span className="sp-title">Bilka</span>
			<span className="sp-subtitle">SPENDLY-441 · 3.980,00 kr.</span>
		</Card>
		<Card>
			<span className="sp-title">IKEA</span>
			<span className="sp-subtitle">SPENDLY-420 · 899,00 kr.</span>
		</Card>
		<Scrim />
		<Sheet aria-label="Set a status" onDismiss={() => {}}>
			<span className="sp-heading">Set a status</span>
			<FieldGroup>
				<Choice variant="row"><Radio name="sheet-status" defaultChecked />Approved</Choice>
				<Choice variant="row"><Radio name="sheet-status" />In progress</Choice>
				<Choice variant="row"><Radio name="sheet-status" />Returned</Choice>
			</FieldGroup>
			<Button fullWidth>Apply</Button>
		</Sheet>
	</div>
);

export const NoHandle = () => (
	<div className="sp-phone sp-touch">
		<Card>
			<span className="sp-title">3 orders picked</span>
			<span className="sp-subtitle">Bilka, IKEA and Indbo Møbler · 29.189,00 kr.</span>
		</Card>
		<Card>
			<span className="sp-title">Indbo Møbler</span>
			<span className="sp-subtitle">SPENDLY-447 · 24.310,00 kr.</span>
		</Card>
		<Scrim />
		<Sheet handle={false} aria-label="Delete 3 orders">
			<span className="sp-heading">Delete 3 orders?</span>
			<span className="sp-subtitle">Their lines and receipts are deleted with them.</span>
			<Button color="danger" fullWidth>Delete</Button>
			<Button variant="text" fullWidth>Cancel</Button>
		</Sheet>
	</div>
);
