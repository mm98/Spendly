import { Chat, ChatThread, ChatDivider, ChatMessage, ChatQuestion, ChatSave, ChatReply, ChatFigures, ChatDock, ChatMore, ChatStart, ChatExamples, ChatPick, ChatLimit, SpendlyMark, Mark, Menu, MenuItem, MenuSeparator, Empty, EmptyTitle, EmptyBody } from 'spendly-react';

const frame = { display: 'flex', flexDirection: 'column', height: 560, maxWidth: 720 } as const;
const me = <Mark size="small" fill="solid" swatch="green-3" round aria-hidden="true" aria-label="Camilla Petersen"><>CP</></Mark>;
const menu = (
	<ChatMore>
		<Menu position="floating" aria-label="Conversation">
			<MenuItem icon="message-circle" to="/ask/chats">Chats</MenuItem>
			<MenuItem icon="paperclip" to="/ask/files">Files</MenuItem>
			<MenuSeparator />
			<MenuItem icon="plus" onClick={() => {}}>New chat</MenuItem>
		</Menu>
	</ChatMore>
);

export const Conversation = () => (
	<div style={frame}>
		<Chat>
			<ChatThread>
				<ChatDivider>Today</ChatDivider>
				<ChatMessage mine mark={me} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave saved onClick={() => {}} />}>
					<ChatQuestion>How much did I spend at Bilka in September?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:20">
					<ChatReply>
						<p>You spent <span className="sp-amount">4.812,50 kr.</span> at Bilka in September, across 6 orders.</p>
						<ChatFigures>
							<table className="sp-table sp-table--compact sp-table--static">
								<thead><tr><th>Week</th><th className="sp-col-number">Orders</th><th className="sp-col-amount">Total</th></tr></thead>
								<tbody>
									<tr><td>Week 36</td><td className="sp-col-number">2</td><td className="sp-col-amount">1.640,00</td></tr>
									<tr><td>Week 38</td><td className="sp-col-number">3</td><td className="sp-col-amount">2.512,50</td></tr>
									<tr><td>Week 39</td><td className="sp-col-number">1</td><td className="sp-col-amount">660,00</td></tr>
								</tbody>
							</table>
						</ChatFigures>
					</ChatReply>
				</ChatMessage>
				<ChatMessage mine mark={me} time="09:43" sentAt="2026-10-24T09:43:00" end={<ChatSave onClick={() => {}} />}>
					<ChatQuestion>And at IKEA?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />}>
					<ChatReply state="working" doing="Reading your orders" />
				</ChatMessage>
			</ChatThread>
			<ChatDock value="" onChange={() => {}} onSend={() => {}} onStop={() => {}} onHelp={() => {}} working placeholder="Ask about your orders, vendors and budget" end={menu} />
		</Chat>
	</div>
);

export const StartPage = () => (
	<div style={frame}>
		<Chat>
			<ChatStart>
				<Empty>
					<SpendlyMark size="large" />
					<EmptyTitle>Ask about your money</EmptyTitle>
					<EmptyBody>Answers come from your orders, vendors, categories, budget and statistics, and can be a file or a chart. Asking never changes anything.</EmptyBody>
				</Empty>
				<ChatExamples>
					<ChatPick question="How much did I spend at Bilka in September?" onChoose={() => {}} onRemove={() => {}} />
					<ChatPick question="Which category went over its budget in August?" onChoose={() => {}} onRemove={() => {}} />
					<ChatPick question="Make an Excel file of my orders at Indbo Møbler" onChoose={() => {}} onRemove={() => {}} />
				</ChatExamples>
			</ChatStart>
			<ChatDock value="Show my spending per month as a chart" onChange={() => {}} onSend={() => {}} onHelp={() => {}} placeholder="Ask about your orders, vendors and budget" end={menu} />
		</Chat>
	</div>
);

export const LimitReached = () => (
	<div style={frame}>
		<Chat>
			<ChatLimit left={0} />
			<ChatThread>
				<ChatDivider>Today</ChatDivider>
				<ChatMessage mine mark={me} time="14:02" sentAt="2026-10-24T14:02:00" end={<ChatSave onClick={() => {}} />}>
					<ChatQuestion>What was my biggest order this year?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time="14:02" sentAt="2026-10-24T14:02:15">
					<ChatReply>
						<p>Your biggest order this year is <a href="#/orders/SPENDLY-447">SPENDLY-447</a> at Indbo Møbler, <span className="sp-amount">24.310,00 kr.</span>, from 19 August.</p>
					</ChatReply>
				</ChatMessage>
			</ChatThread>
			<ChatDock value="" onChange={() => {}} onSend={() => {}} onHelp={() => {}} disabled placeholder="No questions left today" end={menu} />
		</Chat>
	</div>
);

export const FewLeft = () => (
	<div style={{ ...frame, height: 'auto' }}>
		<Chat>
			<ChatLimit left={2} />
			<ChatDock value="" onChange={() => {}} onSend={() => {}} onHelp={() => {}} placeholder="Ask about your orders, vendors and budget" end={menu} />
		</Chat>
	</div>
);
