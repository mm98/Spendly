import { Card, Icon, Mark, SumHead } from 'spendly-react';

const col = { display: 'grid', gap: 12, maxWidth: 420 } as const;

export const StartChoices = () => (
	<div style={col}>
		<Card to="/orders/new?source=empty">
			<SumHead
				mark={<Mark size="large" aria-hidden="true"><Icon name="file-text" size={24} /></Mark>}
				title="Empty order"
				subtitle="Type the details yourself."
				chevron={<Icon name="chevron-right" size={14} />}
			/>
		</Card>
		<Card to="/orders/new?pick=copy">
			<SumHead
				mark={<Mark size="large" aria-hidden="true"><Icon name="copy" size={24} /></Mark>}
				title="Copy an order"
				subtitle="Same vendor, same lines, new date."
				chevron={<Icon name="chevron-right" size={14} />}
			/>
		</Card>
	</div>
);

export const Summary = () => (
	<div style={col}>
		<Card>
			<SumHead
				mark={<Mark size="large" aria-hidden="true"><Icon name="receipt" size={24} /></Mark>}
				title="SPENDLY-447"
				subtitle="Indbo Møbler · 19 Aug 2026"
			/>
		</Card>
		<Card>
			<SumHead mark={<Mark size="large" aria-hidden="true"><Icon name="tag" size={24} /></Mark>} title="Havemøbler" />
		</Card>
	</div>
);
