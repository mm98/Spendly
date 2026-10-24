import { ChatFiles, ChatFile } from 'spendly-react';

const box = { maxWidth: 520 } as const;
const noop = () => {};

export const InAnAnswer = () => (
	<div style={box}>
		<ChatFiles>
			<ChatFile title="Orders at Bilka in 2026.xlsx" kind="Excel" size="18 KB" href="#" />
			<ChatFile title="September 2026 in summary.docx" kind="Word" state="making" />
		</ChatFiles>
	</div>
);

export const States = () => (
	<div style={box}>
		<ChatFiles>
			<ChatFile title="Orders at IKEA.csv" kind="CSV" size="6 KB" href="#" />
			<ChatFile title="Budget for September 2026.pdf" kind="PDF" state="making" />
			<ChatFile title="All orders.xlsx" kind="Excel" state="failed" reason="too many orders for one file. Ask for one year at a time." />
			<ChatFile title="Budget for August 2026.pdf" kind="PDF" state="gone" gone="expired" />
			<ChatFile title="Orders at Indbo Møbler.xlsx" kind="Excel" state="gone" gone="deleted" />
		</ChatFiles>
	</div>
);

export const OnFiles = () => (
	<div style={box}>
		<ChatFiles>
			<ChatFile title="Orders at Bauhaus.csv" kind="CSV" size="6 KB" keptUntil="2026-11-21" href="#" chatTo="/ask/42" onDelete={noop} />
			<ChatFile title="Orders at Bilka in 2026.xlsx" kind="Excel" size="18 KB" keptUntil="2026-11-19" href="#" chatTo="/ask/41" onDelete={noop} />
		</ChatFiles>
	</div>
);

export const OnChats = () => (
	<div style={box}>
		<ChatFiles>
			<ChatFile icon="message-circle" title="How much did I spend at Bilka in September?" to="/ask/42" meta="4 questions · 1 file" />
			<ChatFile icon="message-circle" title="Which category went over its budget in August?" to="/ask/41" meta="2 questions" />
		</ChatFiles>
	</div>
);
