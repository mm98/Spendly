---
category: Ask
---
The bar under the Ask conversation: the question field with What Ask can do at its edge, Send (or Stop while an answer comes), then the conversation menu.

## Props

- `value`: the field's text.
- `onChange`: receives the new text (not an event).
- `onSend`: Send was pressed. Send is disabled while the text is blank.
- `onStop`: Stop was pressed; Stop replaces Send while `working`.
- `onHelp`: opens What Ask can do (`ChatHelp` in a dialog or sheet). Never disabled.
- `working`: an answer is being written. Default `false`.
- `disabled`: the field and Send are off, e.g. no questions left today. Default `false`.
- `bar`: pins it as a bar above a phone's tab bar, with a small Send. Default `false`.
- `placeholder`: e.g. `'Ask about your orders, vendors and budget'`, `'Ask a follow-up'`, `'No questions left today'`.
- `fieldRef`: receives the textarea.
- `end`: after Send, usually `<ChatMore>` with the conversation `Menu`.
- Other props (e.g. `onKeyDown`) go to the textarea.

## Rules

- No `className` or `style`: other props land on the textarea.
- The field grows from one line to six.

## Example

```jsx
<ChatDock value={text} onChange={setText} onSend={send} onStop={stop} onHelp={openHelp} working={working}
	placeholder="Ask about your orders, vendors and budget"
	end={<ChatMore><Menu position="floating" aria-label="Conversation"><MenuItem icon="plus" onClick={newChat}>New chat</MenuItem></Menu></ChatMore>} />
```
