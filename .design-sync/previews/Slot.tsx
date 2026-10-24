import { Slot } from 'spendly-react';

// a chair on a warm wall, drawn inline so the card needs no network
const chair = 'data:image/svg+xml,' + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">'
	+ '<rect width="240" height="240" fill="#e9dccb"/><rect y="170" width="240" height="70" fill="#cdb79b"/>'
	+ '<rect x="70" y="60" width="100" height="80" rx="18" fill="#3f6b55"/><rect x="60" y="125" width="120" height="35" rx="12" fill="#335a47"/>'
	+ '<rect x="72" y="160" width="10" height="45" fill="#5a4330"/><rect x="158" y="160" width="10" height="45" fill="#5a4330"/></svg>'
);
const noop = () => {};
const row = { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' } as const;

export const Default = () => (
	<div style={row}>
		<Slot id="slot-empty" name="the picture" onFile={noop} onRemove={noop} />
		<Slot id="slot-filled" src={chair} name="the picture" onFile={noop} onRemove={noop} />
	</div>
);

export const Sizes = () => (
	<div style={row}>
		<Slot id="slot-medium" size="medium" word="Add photo" name="the line's photo" onFile={noop} onRemove={noop} />
		<Slot id="slot-medium-filled" size="medium" src={chair} name="the line's photo" onFile={noop} onRemove={noop} />
		<Slot id="slot-start" start size="large" kind={null} name="the image" onFile={noop} onRemove={noop} />
	</div>
);

export const Problems = () => (
	<div style={row}>
		<Slot id="slot-large" src={chair} name="the line's photo" problem="Too large" onFile={noop} onRemove={noop} />
		<Slot id="slot-failed" src={chair} name="the line's photo" problem="Failed" onRetry={noop} onFile={noop} onRemove={noop} />
	</div>
);

export const Sending = () => (
	<div style={row}>
		<Slot id="slot-busy" src={chair} busy name="the line's photo" onFile={noop} onRemove={noop} />
	</div>
);
