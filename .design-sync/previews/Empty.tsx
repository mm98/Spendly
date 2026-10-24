import { Button, Card, Empty, EmptyBody, EmptyTitle } from 'spendly-react';

export const Default = () => (
	<div style={{ maxWidth: 480 }}>
		<Card>
			<Empty>
				<EmptyTitle>No orders in August</EmptyTitle>
				<EmptyBody>Every order you scan or enter will appear here.</EmptyBody>
			</Empty>
		</Card>
	</div>
);

export const Dashed = () => (
	<div style={{ maxWidth: 480 }}>
		<Empty dashed>
			<EmptyTitle>Nothing matches those filters</EmptyTitle>
			<EmptyBody>Three filters are on: August, Decor, over 1.000 kr.</EmptyBody>
		</Empty>
	</div>
);

export const WithAction = () => (
	<div style={{ maxWidth: 480 }}>
		<Card>
			<Empty>
				<EmptyTitle>No bookmarks yet</EmptyTitle>
				<EmptyBody>Save a page from IKEA or Bilka to buy it later.</EmptyBody>
				<Button variant="outline" size="small" iconStart="plus">Add a bookmark</Button>
			</Empty>
		</Card>
	</div>
);
