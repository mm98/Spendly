import { ListMore, Button } from 'spendly-react';

export const MoreToLoad = () => (
	<ListMore shown={20} total={64} pageSize={20} onMore={() => {}} />
);

export const AllLoaded = () => (
	<ListMore shown={64} total={64} pageSize={20} onMore={() => {}} />
);

export const LooseWithAction = () => (
	<ListMore loose shown={1240} total={3518} pageSize={40} onMore={() => {}} locale="da-DK">
		<Button variant="text" size="small">Export all</Button>
	</ListMore>
);
