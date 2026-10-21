import { join, pick, reject } from './variants.js'
import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Spinner } from './Utilities.jsx'

/* ---------- chat (c34, Ask 24a) ---------- */

// the sidebar brand's mark: what speaks for Spendly beside each answer and over the empty page
export const SpendlyMark = ({ size = 'small' }) => <Mark size={size} fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>

/** The conversation and the dock under it, filling the content column. */
export function Chat({ children, ...rest }) {
	reject(rest, 'Chat')
	return <div className="sp-chat" {...rest}>{children}</div>
}

/** The messages, oldest first, in the part that scrolls; an answer is read out when it arrives. */
export function ChatThread({ scrollRef, children, ...rest }) {
	reject(rest, 'ChatThread')
	return (
		<div className="sp-chat__scroll" ref={scrollRef}>
			<div className="sp-chat__thread" role="log" aria-live="polite" aria-label="Conversation" {...rest}>{children}</div>
		</div>
	)
}

/** The empty conversation: the empty state, and the example questions under it. */
export function ChatStart({ children, ...rest }) {
	reject(rest, 'ChatStart')
	return <div className="sp-chat__start" {...rest}>{children}</div>
}

export function ChatExamples({ children, ...rest }) {
	reject(rest, 'ChatExamples')
	return <div className="sp-chat__examples" {...rest}>{children}</div>
}

/** One message: its `mark` outside the bubble, and `end` after it. `mine` is the reader's own, at the right. */
export function ChatMessage({ mine = false, mark, end, children, ...rest }) {
	reject(rest, 'ChatMessage')
	return <div className={join('sp-chat__msg', mine && 'sp-chat__msg--mine')} {...rest}>{mark}{children}{end}</div>
}

/** The reader's question, as they asked it. */
export function ChatQuestion({ children, ...rest }) {
	reject(rest, 'ChatQuestion')
	return <div className="sp-chat__question" {...rest}>{children}</div>
}

/** Saves a question or, `saved`, removes it again; `tip` says why it is disabled. */
export function ChatSave({ saved = false, disabled = false, tip, onClick, ...rest }) {
	reject(rest, 'ChatSave')
	return (
		<button type="button" className="sp-chat__save sp-icon-btn sp-icon-btn--small" aria-pressed={saved ? 'true' : 'false'}
			aria-label={saved ? 'Saved question' : 'Save this question'} disabled={disabled} data-tip={tip} onClick={onClick} {...rest}>
			<Icon name="bookmark" size={14} />
		</button>
	)
}

const REPLY_STATE = { answered: true, working: true, failed: true }

/** Spendly's answer: `working` while it comes, `failed` with Try again, or the reply. */
export function ChatReply({ state = 'answered', onRetry, children, ...rest }) {
	reject(rest, 'ChatReply')
	pick(REPLY_STATE, state, 'state', 'ChatReply')
	if (state === 'working') return <div className="sp-chat__working" {...rest}><Spinner /><span>Reading your orders</span></div>
	return (
		<div className="sp-chat__reply" {...rest}>
			{state === 'failed'
				? <><p className="sp-chat__failed">Spendly could not answer that just now.</p><Button variant="outline" size="small" onClick={onRetry}>Try again</Button></>
				: children}
		</div>
	)
}

/** A small table of figures inside an answer, framed as a block. */
export function ChatFigures({ children, ...rest }) {
	reject(rest, 'ChatFigures')
	return <div className="sp-chat__figures" {...rest}>{children}</div>
}

/** A saved question on the empty page: pressing it sends it, and the x beside it removes it. One
    line, cut with ... past 320px, the whole question in its tooltip. */
export function ChatPick({ question, disabled = false, onSend, onRemove, ...rest }) {
	reject(rest, 'ChatPick')
	return (
		<span className="sp-chat__pick">
			<Button variant="outline" size="small" disabled={disabled} title={question} onClick={onSend}><span className="sp-truncate">{question}</span></Button>
			<IconButton icon={<Icon name="x" size={9} />} size="small" aria-label={`Remove ${question}`} onClick={onRemove} />
		</span>
	)
}

/** Under the thread: the field and Send, or Stop while `working`, then `end`. `bar` pins it above a
    phone's tab bar, where the hint has no keys and shows only `left`. */
export function ChatDock({ bar = false, value, onChange, onSend, onStop, working = false, disabled = false, fieldRef, placeholder, left, end, ...rest }) {
	reject(rest, 'ChatDock')
	const size = bar ? 'small' : 'standard'
	return (
		<div className={join('sp-chat__dock', bar && 'sp-chat__dock--bar')}>
			<div className="sp-chat__composer">
				<textarea ref={fieldRef} className="sp-textarea sp-chat__field" rows={1} value={value} disabled={disabled}
					onChange={ev => onChange(ev.target.value)} placeholder={placeholder} aria-label="Ask" {...rest} />
				{working
					? <Button variant="outline" size={size} onClick={onStop}>Stop</Button>
					: <Button size={size} disabled={disabled || !value.trim()} onClick={onSend}>Send</Button>}
				{end}
			</div>
			{bar && !left
				? null
				: (
					<div className="sp-chat__hint">
						{bar ? null : <span>Enter sends, Shift Enter makes a new line</span>}
						<span className="sp-grow" />
						{left ? <span className="sp-meta--over">{left}</span> : null}
					</div>
				)}
		</div>
	)
}
