import { ChatHelp, Card } from 'spendly-react';

const box = { maxWidth: 460 } as const;
const noop = () => {};

export const Makes = () => (
	<div style={box}>
		<Card>
			<ChatHelp onChoose={noop} makes={[
				{ name: 'Files', formats: ['Excel', 'CSV', 'Word', 'PDF'], example: 'Make an Excel file of my orders in October' },
				{ name: 'Charts', formats: ['Bar chart', 'Donut chart'], example: 'Show my spending per month as a chart' }
			]} />
		</Card>
	</div>
);

export const OneOff = () => (
	<div style={box}>
		<Card>
			<ChatHelp onChoose={noop} makes={[
				{ name: 'Files', off: 'Ask cannot make files on this Spendly.' },
				{ name: 'Charts', formats: ['Bar chart', 'Donut chart'], example: 'Show my spending per month as a chart' }
			]} />
		</Card>
	</div>
);

export const NoneLeft = () => (
	<div style={box}>
		<Card>
			<ChatHelp disabled onChoose={noop} makes={[
				{ name: 'Files', formats: ['Excel', 'CSV', 'Word', 'PDF'], example: 'Make an Excel file of my orders in October' },
				{ name: 'Charts', formats: ['Bar chart', 'Donut chart'], example: 'Show my spending per month as a chart' }
			]} />
		</Card>
	</div>
);
