import { Alert, Button, Dialog, DialogActions, DialogBody, DialogTitle, Scrim } from 'spendly-react';

// the backdrop is drawn by hand: a Dialog with its own scrim is sent to the bottom of the page
const frame = { position: 'relative', minHeight: 360, borderRadius: 12, overflow: 'hidden', display: 'grid' } as const;

export const DeleteOrder = () => (
	<div style={frame}>
		<Scrim dialog>
			<Dialog scrim={false} aria-label="Delete this order?">
				<DialogTitle>Delete this order?</DialogTitle>
				<DialogBody>SPENDLY-447 from Indbo Møbler, 3.980,00 kr. Its 4 lines and 3 attachments go with it, and the August total drops by 3.980,00 kr.</DialogBody>
				<DialogActions>
					<Button variant="outline">Keep it</Button>
					<span className="sp-grow" />
					<Button color="danger" iconStart="trash">Delete order</Button>
				</DialogActions>
			</Dialog>
		</Scrim>
	</div>
);

export const EqualActions = () => (
	<Dialog scrim={false}>
		<DialogTitle>Undo this import?</DialogTitle>
		<DialogBody>Orders 2026.xlsx, imported 12 Aug. Undoing deletes its 40 orders and 126 item lines.</DialogBody>
		<DialogActions>
			<Button variant="outline" fullWidth>Keep the orders</Button>
			<Button color="danger" fullWidth>Delete 40 orders</Button>
		</DialogActions>
	</Dialog>
);

export const PlainWords = () => (
	<Dialog scrim={false}>
		<DialogTitle>Leave without saving?</DialogTitle>
		The changes to SPENDLY-447 are lost.
		<DialogActions>
			<Button variant="text">Stay</Button>
			<Button>Leave</Button>
		</DialogActions>
	</Dialog>
);

export const WithAlert = () => (
	<Dialog scrim={false}>
		<DialogTitle>Undo this import?</DialogTitle>
		<Alert color="danger" mark="!" title="What the undo deletes did not load" action={<Button variant="outline" size="small">Try again</Button>} below>
			Nothing is deleted yet. Check your connection.
		</Alert>
		<DialogActions>
			<Button variant="outline" fullWidth>Keep the orders</Button>
			<Button color="danger" fullWidth disabled>Undo this import</Button>
		</DialogActions>
	</Dialog>
);
