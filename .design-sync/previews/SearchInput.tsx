import { AskTrail, Kbd, SearchInput } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 380 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<SearchInput value="" onChange={noop} placeholder="Search orders" aria-label="Search orders" />
		<SearchInput value="Bilka" onChange={noop} placeholder="Search orders" aria-label="Search orders" />
	</div>
);

export const WithKey = () => (
	<div style={col}>
		<SearchInput value="" onChange={noop} placeholder="Search orders, vendors, items…" aria-label="Search orders" kbd={<Kbd>⌘K</Kbd>} />
		<SearchInput value="" onChange={noop} icon="filter" clear={false} placeholder="Find a vendor…" aria-label="Find a vendor" />
	</div>
);

export const WithAsk = () => (
	<div style={col}>
		<SearchInput value="" onChange={noop} placeholder="Search orders" aria-label="Search orders" ends={<AskTrail onToggle={noop} />} />
		<SearchInput value="What did IKEA cost this year?" onChange={noop} aria-label="Ask about your orders" ends={<AskTrail on onToggle={noop} />} />
		<SearchInput value="What did IKEA cost this year?" onChange={noop} aria-label="Ask about your orders" ends={<AskTrail on busy onStop={noop} />} />
	</div>
);
