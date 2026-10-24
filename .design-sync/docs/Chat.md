---
category: Ask
---
The Ask page's conversation: the part that scrolls (the thread, or the empty start) and the dock under it, filling the content column.

## Props

- `spaced`: the inner one on Chats and Files, holding the controls bar 12 above the list. Default `false`.
- `children`: in order, an optional `ChatLimit`, then `ChatThread` or `ChatStart`, then `ChatDock`.

## Parts

- `ChatThread`: the messages, oldest first, in the part that scrolls; an answer is read out when it arrives. `scrollRef` receives the scrolling box.
- `ChatScroll`: the part that scrolls on its own (the list on Chats and Files). Each edge fades while more lies past it. `scrollRef`.
- `ChatDivider`: the day line that opens a conversation and stands wherever the day changes: Today, Yesterday, 12 Oct.
- `ChatQuestion`: the reader's question, as asked, inside a `mine` `ChatMessage`.
- `ChatSave`: the bookmark beside a question. `saved` (filled, removes it again), `disabled`, `tip` (says why it is disabled), `onClick`.
- `ChatFigures`: a small table of figures inside an answer, framed as a block. Holds a `table.sp-table.sp-table--compact.sp-table--static`; figure columns take `sp-col-number` or `sp-col-amount`.
- `ChatStart`: the empty conversation: an `Empty` (with `SpendlyMark size="large"`, `EmptyTitle`, `EmptyBody`) and the saved questions under it.
- `ChatExamples`: the row of `ChatPick`s on the empty page, centred and wrapping.
- `ChatLimit`: the day's limit, as `Chat`'s first child. `left`: questions left today. Shown with 3 or fewer; nothing with more or with `left` null. At 0 it says no questions are left.
- `ChatMore`: the conversation menu beside Send, passed as `ChatDock`'s `end`. `children` is the `Menu` (`position="floating"`) it opens upward; a choice closes it. With `back` (a route) it is the link back to the chat instead, on Chats and Files.
- `SpendlyMark`: what speaks for Spendly beside each answer and over the empty page. `size`: `'small'` (default) | `'large'`.

## Rules

- Takes no `className` or `style` (nor do its parts).
- `Chat` fills the height it is given: the thread or start takes the free space and the dock sits at the bottom.
- A message never spans the column: Spendly's at the left, the reader's at the right.

## Example

```jsx
<Chat>
	<ChatLimit left={2} />
	<ChatThread>
		<ChatDivider>Today</ChatDivider>
		<ChatMessage mine mark={me} time="09:41" sentAt="2026-10-24T09:41:00" end={<ChatSave onClick={save} />}>
			<ChatQuestion>How much did I spend at Bilka in September?</ChatQuestion>
		</ChatMessage>
		<ChatMessage mark={<SpendlyMark />} time="09:41" sentAt="2026-10-24T09:41:20">
			<ChatReply><p>You spent <span className="sp-amount">4.812,50 kr.</span> at Bilka in September.</p></ChatReply>
		</ChatMessage>
	</ChatThread>
	<ChatDock value={text} onChange={setText} onSend={send} onHelp={openHelp} end={<ChatMore><Menu position="floating" aria-label="Conversation">…</Menu></ChatMore>} />
</Chat>
```
