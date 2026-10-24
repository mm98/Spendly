import { ChatPick } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 640 } as const;
const noop = () => {};

export const Saved = () => (
	<div style={row}>
		<ChatPick question="How much did I spend at Bilka in September?" onChoose={noop} onRemove={noop} />
		<ChatPick question="Which category went over its budget in August?" onChoose={noop} onRemove={noop} />
	</div>
);

export const LongQuestion = () => (
	<div style={row}>
		<ChatPick question="Make an Excel file of every order at Indbo Møbler and IKEA since January, with the lines and what I saved" onChoose={noop} onRemove={noop} />
	</div>
);

export const Example = () => (
	<div style={row}>
		<ChatPick question="Show my spending per month as a chart" onChoose={noop} />
	</div>
);

export const Disabled = () => (
	<div style={row}>
		<ChatPick question="How much did I spend at Bilka in September?" disabled onChoose={noop} onRemove={noop} />
	</div>
);
