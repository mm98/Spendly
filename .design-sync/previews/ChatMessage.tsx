import { ChatThread, ChatMessage, ChatQuestion, ChatSave, ChatReply, SpendlyMark, Mark } from 'spendly-react';

const me = <Mark size="small" fill="solid" swatch="green-3" round aria-hidden="true" aria-label="Camilla Petersen"><>CP</></Mark>;
const box = { maxWidth: 640 } as const;

export const Pair = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mine mark={me} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave onClick={() => {}} />}>
				<ChatQuestion>Which vendor did I spend the most at in August?</ChatQuestion>
			</ChatMessage>
			<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:18">
				<ChatReply>
					<p>Indbo Møbler, with <span className="sp-amount">24.310,00 kr.</span> across 3 orders. Bilka comes next with <span className="sp-amount">4.812,50 kr.</span></p>
				</ChatReply>
			</ChatMessage>
		</ChatThread>
	</div>
);

export const SaveStates = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mine mark={me} end={<ChatSave saved onClick={() => {}} />}>
				<ChatQuestion>How much is left of the Decor budget?</ChatQuestion>
			</ChatMessage>
			<ChatMessage mine mark={me} end={<ChatSave disabled tip="10 saved. Remove one to save another." />}>
				<ChatQuestion>Show my orders at IKEA this year</ChatQuestion>
			</ChatMessage>
		</ChatThread>
	</div>
);

export const Writing = () => (
	<div style={box}>
		<ChatThread>
			<ChatMessage mark={<SpendlyMark />}>
				<ChatReply state="working" doing="Making your Excel file" />
			</ChatMessage>
		</ChatThread>
	</div>
);
