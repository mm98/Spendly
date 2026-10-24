import { Anchor, IconButton, Menu, MenuItem, MenuLabel, MenuSeparator } from 'spendly-react';

export const Plain = () => (
	<div style={{ maxWidth: 260 }}>
		<Menu aria-label="This order">
			<MenuLabel>This order</MenuLabel>
			<MenuItem icon="pencil" onClick={() => {}}>Edit</MenuItem>
			<MenuItem icon="copy" onClick={() => {}}>Duplicate</MenuItem>
			<MenuSeparator />
			<MenuItem icon="download" onClick={() => {}}>Export</MenuItem>
			<MenuItem icon="trash" disabled>Delete</MenuItem>
		</Menu>
	</div>
);

export const OpenFromButton = () => (
	<div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 300, minHeight: 250 }}>
		<Anchor open>
			<IconButton icon="dots-vertical" aria-label="Actions for SPENDLY-447" aria-haspopup="menu" aria-expanded="true" onClick={() => {}} />
			<Menu position="floating" aria-label="This order">
				<MenuItem icon="pencil" onClick={() => {}}>Edit</MenuItem>
				<MenuItem icon="tag" onClick={() => {}}>Set status</MenuItem>
				<MenuItem icon="download" onClick={() => {}}>Export</MenuItem>
				<MenuSeparator />
				<MenuItem icon="trash" danger onClick={() => {}}>Delete order</MenuItem>
			</Menu>
		</Anchor>
	</div>
);

export const StatusesAndChecks = () => (
	<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start' }}>
		<div style={{ width: 220 }}>
			<Menu aria-label="Set the status">
				<MenuLabel>Set status</MenuLabel>
				<MenuItem dot="draft" onClick={() => {}}>Draft</MenuItem>
				<MenuItem dot="progress" selected onClick={() => {}}>In progress</MenuItem>
				<MenuItem dot="done" onClick={() => {}}>Delivered</MenuItem>
				<MenuItem dot="returned" onClick={() => {}}>Returned</MenuItem>
				<MenuItem dot="cancelled" onClick={() => {}}>Cancelled</MenuItem>
			</Menu>
		</div>
		<div style={{ width: 220 }}>
			<Menu aria-label="Sort orders">
				<MenuLabel>Sort by</MenuLabel>
				<MenuItem selected onClick={() => {}}>Newest first</MenuItem>
				<MenuItem selected={false} onClick={() => {}}>Oldest first</MenuItem>
				<MenuItem selected={false} onClick={() => {}}>Highest total</MenuItem>
			</Menu>
		</div>
	</div>
);

export const WithLinks = () => (
	<div style={{ maxWidth: 260 }}>
		<Menu aria-label="Conversation">
			<MenuItem icon="eye" to="/orders?vendor=1">Open the orders</MenuItem>
			<MenuItem icon="bookmark" onClick={() => {}}>Save as a bookmark</MenuItem>
			<MenuSeparator />
			<MenuItem icon="trash" danger onClick={() => {}}>Delete conversation</MenuItem>
		</Menu>
	</div>
);
