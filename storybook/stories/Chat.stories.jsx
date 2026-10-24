import { useState } from 'react'
import { SpendlyMark, Chat, ChatThread, ChatStart, ChatExamples, ChatMessage, ChatDivider, ChatQuestion, ChatSave, ChatReply, ChatFigures, ChatFiles, ChatFile, ChatChart, ChatPick, ChatHelp, ChatDock, ChatShares, ChatMore } from '../../react/src/components/Chat.jsx'
import { Bars, Donut, Shares, ShareRow } from '../../react/src/components/Data.jsx'
import { Menu, MenuItem } from '../../react/src/components/Overlays.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Empty, EmptyTitle, EmptyBody } from '../../react/src/components/Utilities.jsx'
import { expect, fn, userEvent } from 'storybook/test'
import { knownAccessibilityFaults } from './controls.js'

const ME = <Mark size="small" fill="solid">Anna Kristensen</Mark>
const text = description => ({ control: 'text', description })

export default {
	title: 'Ask/Conversation',
	component: Chat,
	subcomponents: { ChatThread, ChatStart, ChatExamples, ChatMessage, ChatDivider, ChatQuestion, ChatSave, ChatReply, ChatFigures, ChatFiles, ChatFile, ChatChart, ChatPick, ChatHelp, ChatDock, ChatShares, ChatMore, SpendlyMark },
	parameters: { layout: 'fullscreen' },
	decorators: [Story => <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}><Story /></div>],
	args: { onSend: fn() },
	argTypes: { children: { control: false } }
}

// The box the question is typed in, holding what is typed; `onSend` is each story's action.
const Dock = ({ onSend, ...props }) => {
	const [typed, setTyped] = useState('')
	return (
		<ChatDock value={typed} onChange={setTyped} onSend={() => { onSend?.(typed); setTyped('') }} onHelp={() => {}} placeholder="Ask about your orders, vendors and budget"
			end={<ChatMore><Menu position="floating" aria-label="Conversation"><MenuItem icon="plus" onClick={() => {}}>New chat</MenuItem></Menu></ChatMore>} {...props} />
	)
}

export const Empty_ = {
	name: 'Empty',
	args: { onChoose: fn(), onRemove: fn() },
	render: ({ onSend, onChoose, onRemove }) => (
		<Chat>
			<ChatStart>
				<Empty>
					<SpendlyMark size="large" />
					<EmptyTitle>Ask about your money</EmptyTitle>
					<EmptyBody>Answers come from your orders, vendors, categories, budget and statistics, and can be a file or a chart. Asking never changes anything.</EmptyBody>
				</Empty>
				<ChatExamples>
					<ChatPick question="How much did I spend at Bilka this year?" onChoose={onChoose} onRemove={onRemove} />
					<ChatPick question="Which category went most over its limit in September?" onChoose={onChoose} onRemove={onRemove} />
				</ChatExamples>
			</ChatStart>
			<Dock onSend={onSend} />
		</Chat>
	),
	play: async ({ args, canvas }) => {
		await userEvent.type(canvas.getByRole('textbox', { name: 'Ask' }), 'What did I spend on lamps?')
		await userEvent.click(canvas.getByRole('button', { name: 'Send' }))
		await expect(args.onSend).toHaveBeenCalledWith('What did I spend on lamps?')
	}
}

export const Answered = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { question: 'How much did I spend per month this year?', answer: 'You spent 41.710,00 kr. from April to September. August was the biggest month.', time: '09:41', saved: false, onSave: fn() },
	argTypes: { question: text('ChatQuestion\'s words'), answer: text('The reply\'s first line'), time: text('ChatMessage\'s `time`'), saved: { description: 'ChatSave\'s `saved`' } },
	render: ({ question, answer, time, saved, onSave, onSend }) => (
		<Chat>
			<ChatThread>
				<ChatDivider>Today</ChatDivider>
				<ChatMessage mine mark={ME} time={time} sentAt="2026-10-24T09:41:00" end={<ChatSave saved={saved} onClick={onSave} />}>
					<ChatQuestion>{question}</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time={time} sentAt="2026-10-24T09:41:05">
					<ChatReply>
						<p>{answer}</p>
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
			<Dock onSend={onSend} />
		</Chat>
	)
}

export const Working = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { doing: 'Reading your orders', onStop: fn() },
	argTypes: { doing: text('ChatReply\'s `doing`') },
	render: ({ doing, onStop }) => (
		<Chat>
			<ChatThread>
				<ChatMessage mine mark={ME} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave saved onClick={() => {}} />}>
					<ChatQuestion>Make a spreadsheet of my orders at Bilka this year</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />}>
					<ChatReply state="working" doing={doing} />
				</ChatMessage>
			</ChatThread>
			<Dock working onStop={onStop} />
		</Chat>
	)
}

export const Failed = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { left: '2 questions left today', onRetry: fn() },
	argTypes: { left: text('What the box says is left today') },
	render: ({ left, onRetry, onSend }) => (
		<Chat>
			<ChatThread>
				<ChatMessage mine mark={ME} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave onClick={() => {}} />}>
					<ChatQuestion>What did I spend on lamps?</ChatQuestion>
				</ChatMessage>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:05">
					<ChatReply state="failed" onRetry={onRetry} />
				</ChatMessage>
			</ChatThread>
			<Dock left={left} onSend={onSend} />
		</Chat>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: /Try again/i }))
		await expect(args.onRetry).toHaveBeenCalledOnce()
	}
}

export const OneFile = {
	args: { title: 'Make a spreadsheet of my orders at Bilka this year', kind: 'Excel', size: '18 KB', state: 'ready', href: '#', reason: 'too many orders for one file.', gone: 'expired', onDelete: fn() },
	argTypes: { gone: { control: 'inline-radio', options: ['deleted', 'expired'], if: { arg: 'state', eq: 'gone' } }, reason: { if: { arg: 'state', eq: 'failed' } } },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: ChatFile, layout: 'padded' },
	render: ({ onSend, state, reason, gone, ...args }) => (
		<div style={{ maxWidth: 640 }}>
			<ChatFiles>
				<ChatFile {...args} state={state} {...(state === 'failed' ? { reason } : {})} {...(state === 'gone' ? { gone } : {})} />
			</ChatFiles>
		</div>
	)
}

export const Files = {
	parameters: { a11y: knownAccessibilityFaults },
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
	args: { disabled: false, onChoose: fn() },
	render: ({ disabled, onChoose }) => (
		<div style={{ padding: 16, maxWidth: 640 }}>
			<ChatHelp disabled={disabled} onChoose={onChoose} makes={[
				{ name: 'Files', formats: ['Excel', 'CSV', 'PDF', 'Word'], example: 'Make a spreadsheet of my orders this year' },
				{ name: 'Charts', formats: ['Columns', 'Shares'], example: 'Show my spending per month as a chart' },
				{ name: 'Emails', off: 'Sending email is not set up on this server.' }
			]} />
		</div>
	)
}

export const SharesInAnAnswer = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { answer: 'Furniture took almost half of August.' },
	argTypes: { answer: text('The reply\'s first line') },
	render: ({ answer, onSend }) => (
		<Chat>
			<ChatThread>
				<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:05">
					<ChatReply>
						<p>{answer}</p>
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
			<Dock onSend={onSend} />
		</Chat>
	)
}
