import { useState } from 'react'
import { SpendlyMark, Chat, ChatThread, ChatStart, ChatExamples, ChatMessage, ChatDivider, ChatQuestion, ChatSave, ChatReply, ChatFigures, ChatFiles, ChatFile, ChatChart, ChatPick, ChatHelp, ChatDock, ChatShares, ChatMore } from '../../react/src/components/Chat.jsx'
import { Bars, Donut, Shares, ShareRow } from '../../react/src/components/Data.jsx'
import { Menu, MenuItem } from '../../react/src/components/Overlays.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Empty, EmptyTitle, EmptyBody } from '../../react/src/components/Utilities.jsx'

const ME = <Mark size="small" fill="solid">Anna Kristensen</Mark>

export default {
	title: 'Ask/Conversation',
	parameters: { layout: 'fullscreen' },
	decorators: [Story => <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}><Story /></div>]
}

const Dock = props => {
	const [text, setText] = useState('')
	return (
		<ChatDock value={text} onChange={setText} onSend={() => setText('')} onHelp={() => {}} placeholder="Ask about your orders, vendors and budget"
			end={<ChatMore><Menu position="floating" aria-label="Conversation"><MenuItem icon="plus" onClick={() => {}}>New chat</MenuItem></Menu></ChatMore>} {...props} />
	)
}

export const Empty_ = {
	name: 'Empty',
	render: () => (
		<Chat>
			<ChatStart>
				<Empty>
					<SpendlyMark size="large" />
					<EmptyTitle>Ask about your money</EmptyTitle>
					<EmptyBody>Answers come from your orders, vendors, categories, budget and statistics, and can be a file or a chart. Asking never changes anything.</EmptyBody>
				</Empty>
				<ChatExamples>
					<ChatPick question="How much did I spend at Bilka this year?" onChoose={() => {}} onRemove={() => {}} />
					<ChatPick question="Which category went most over its limit in September?" onChoose={() => {}} onRemove={() => {}} />
				</ChatExamples>
			</ChatStart>
			<Dock />
		</Chat>
	)
}

export const Answered = {
	render: () => (
		<Chat>
			<ChatThread>
				<ChatDivider>Today</ChatDivider>
				<ChatMessage mine mark={ME} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave onClick={() => {}} />}>
					<ChatQuestion>How much did I spend per month this year?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:05">
					<ChatReply>
						<p>You spent 41.710,00 kr. from April to September. August was the biggest month.</p>
						<ChatChart name="Spending per month" meta="Apr to Sep 2026">
							<Bars columns={[['apr', 'Apr', 50], ['may', 'May', 65], ['jun', 'Jun', 70], ['jul', 'Jul', 60], ['aug', 'Aug', 100], ['sep', 'Sep', 80]].map(([key, tick, height]) => ({ key, tick, height, label: tick }))} />
						</ChatChart>
						<ChatFigures>
							<table className="sp-table sp-table--compact sp-table--static">
								<thead><tr><th>Month</th><th className="sp-number">Spent</th></tr></thead>
								<tbody>
									<tr><td>July</td><td className="sp-number">5.660,00</td></tr>
									<tr><td>August</td><td className="sp-number">9.840,00</td></tr>
								</tbody>
							</table>
						</ChatFigures>
					</ChatReply>
				</ChatMessage>
			</ChatThread>
			<Dock />
		</Chat>
	)
}

export const Working = {
	render: () => (
		<Chat>
			<ChatThread>
				<ChatMessage mine mark={ME} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave saved onClick={() => {}} />}>
					<ChatQuestion>Make a spreadsheet of my orders at Bilka this year</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />}>
					<ChatReply state="working" doing="Reading your orders" />
				</ChatMessage>
			</ChatThread>
			<Dock working onStop={() => {}} />
		</Chat>
	)
}

export const Failed = {
	render: () => (
		<Chat>
			<ChatThread>
				<ChatMessage mine mark={ME} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave onClick={() => {}} />}>
					<ChatQuestion>What did I spend on lamps?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:05">
					<ChatReply state="failed" onRetry={() => {}} />
				</ChatMessage>
			</ChatThread>
			<Dock left="2 questions left today" />
		</Chat>
	)
}

export const Files = {
	render: () => (
		<div style={{ padding: 16, maxWidth: 640 }}>
			<ChatFiles>
				<ChatFile title="Make a spreadsheet of my orders at Bilka this year" kind="Excel" size="18 KB" href="#" />
				<ChatFile title="A summary of September as a document" kind="Word" state="making" />
				<ChatFile title="Make a spreadsheet of every order I have" kind="Excel" state="failed" reason="too many orders for one file. Ask for one year at a time." />
				<ChatFile title="Make a PDF of my budget for August" kind="PDF" state="gone" gone="expired" />
				<ChatFile title="Make a CSV of my orders at Bauhaus" kind="CSV" size="6 KB" keptUntil="2026-11-21" href="#" onDelete={() => {}} />
			</ChatFiles>
		</div>
	)
}

export const WhatAskCanDo = {
	render: () => (
		<div style={{ padding: 16, maxWidth: 640 }}>
			<ChatHelp onChoose={() => {}} makes={[
				{ name: 'Files', formats: ['Excel', 'CSV', 'PDF', 'Word'], example: 'Make a spreadsheet of my orders this year' },
				{ name: 'Charts', formats: ['Columns', 'Shares'], example: 'Show my spending per month as a chart' },
				{ name: 'Emails', off: 'Sending email is not set up on this server.' }
			]} />
		</div>
	)
}

export const SharesInAnAnswer = {
	render: () => (
		<Chat>
			<ChatThread>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:05">
					<ChatReply>
						<p>Furniture took almost half of August.</p>
						<ChatChart name="Spending by category" meta="August 2026">
							<ChatShares>
								<Donut shares={[{ series: 1, value: 48 }, { series: 2, value: 27 }, { series: 3, value: 25 }]} aria-label="Furniture 48%, Decor 27%, Other 25%" />
								<Shares>
									<ShareRow series={1} amount="29.510,00 kr." value="48%" href="#/orders">Furniture</ShareRow>
									<ShareRow series={2} amount="16.600,00 kr." value="27%" href="#/orders">Decor</ShareRow>
									<ShareRow series={3} amount="15.370,00 kr." value="25%" href="#/categories">Other</ShareRow>
								</Shares>
							</ChatShares>
						</ChatChart>
					</ChatReply>
				</ChatMessage>
			</ChatThread>
			<Dock />
		</Chat>
	)
}
