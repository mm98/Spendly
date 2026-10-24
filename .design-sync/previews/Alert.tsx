import { Alert, Button, Icon } from 'spendly-react';

const col = { display: 'grid', gap: 12, maxWidth: 560 } as const;

export const Colors = () => (
	<div style={col}>
		<Alert mark="!" title="This order puts Decor over its limit">24.100 of 22.000 kr. for August. Saving is fine - you will just see it flagged.</Alert>
		<Alert color="danger" mark="!" title="Two of the rows could not be imported">They have no price. The other 36 are ready.</Alert>
		<Alert color="success" mark={<Icon name="check" size={12} />} title="The order was created">SPENDLY-452, with its 3 lines and 2 attachments.</Alert>
	</div>
);

export const WithAction = () => (
	<div style={col}>
		<Alert color="danger" mark="!" title="This receipt could not be opened." action={<Button variant="outline" size="small">Try again</Button>}>
			The file may be damaged. Choose another file.
		</Alert>
		<Alert mark="!" title="3 orders have no category" action={<Button variant="outline" size="small">Review</Button>} />
	</div>
);

export const ActionBelow = () => (
	<div style={{ ...col, maxWidth: 340 }}>
		<Alert color="danger" mark="!" title="What the undo deletes did not load" below action={<Button variant="outline" size="small">Try again</Button>}>
			Nothing is deleted yet. Check your connection.
		</Alert>
	</div>
);

export const TitleOnly = () => (
	<div style={col}>
		<Alert color="success" mark={<Icon name="check" size={12} />} title="Validated against Indbo Møbler." />
		<Alert mark="!">Prices are shown without VAT for this vendor.</Alert>
	</div>
);
