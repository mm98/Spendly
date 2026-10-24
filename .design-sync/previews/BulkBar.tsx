import { BulkBar, Button } from 'spendly-react';

const actions = [
	<Button key="s" variant="outline" size="small">Set status</Button>,
	<Button key="c" variant="outline" size="small">Add category</Button>,
	<Button key="d" color="danger" size="small" iconStart="trash">Delete</Button>
];

export const Default = () => (
	<BulkBar count="3 selected" onClear={() => {}}>{actions}</BulkBar>
);

export const WithSelectAll = () => (
	<BulkBar loose count="4 of 12 selected" selectAll={{ selectedCount: 4, total: 12, noun: 'orders', onToggleAll: () => {} }}>{actions}</BulkBar>
);

export const Head = () => (
	<div style={{ maxWidth: 390 }}>
		<BulkBar head count="2 selected" onClear={() => {}}>
			<Button variant="outline" size="small">Export</Button>
		</BulkBar>
	</div>
);
