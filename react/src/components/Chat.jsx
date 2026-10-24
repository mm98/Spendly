import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { Alert, MenuHostOf, useMenuButton, useMenuPlace } from './Overlays.jsx'
import { Spinner, useDismiss } from './Utilities.jsx'
import { plural } from '../api/format.js'

/* ---------- chat (c34, Ask 24a) ---------- */

// the sidebar brand's mark: what speaks for Spendly beside each answer and over the empty page
export const SpendlyMark = ({ size = 'small' }) => <Mark size={size} fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>

/** The conversation and the dock under it, filling the content column. `spaced` is the inner one on
    Chats and Files (24e, 24f), holding the controls bar 12 above the list.
    @param {object} props
    @param {boolean} [props.spaced] The inner form on Chats and Files: more room above the list.
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The thread, or the empty start, and the limit line. */
export function Chat({ spaced = false, children, ...rest }) {
	reject(rest, 'Chat')
	return <div className={join('sp-chat', spaced && 'sp-gap-12')} {...rest}>{children}</div>
}

// the stylesheet fades an edge of the part that scrolls while more lies past it
function markEdges(box) {
	if (box.scrollTop > 1) box.setAttribute('data-above', 'true')
	else box.removeAttribute('data-above')
	if (box.scrollTop + box.clientHeight < box.scrollHeight - 1) box.setAttribute('data-below', 'true')
	else box.removeAttribute('data-below')
}

/** The part above the dock that scrolls: the thread, or the list on Chats and Files. Each edge fades
    while more lies past it, measured again on a scroll, a new message, a font or a resize.
    @param {object} props
    @param {import('react').Ref<HTMLDivElement>} [props.scrollRef]
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] What scrolls above the dock: the thread, or a list. */
export function ChatScroll({ scrollRef, children, ...rest }) {
	reject(rest, 'ChatScroll')
	const own = useRef(null)
	useLayoutEffect(() => {
		const box = own.current
		if (!box) return
		const mark = () => markEdges(box)
		mark()
		const frame = requestAnimationFrame(mark)
		const sizes = new ResizeObserver(mark)
		sizes.observe(box)
		for (const child of box.children) sizes.observe(child)
		box.addEventListener('scroll', mark, { passive: true })
		return () => {
			cancelAnimationFrame(frame)
			sizes.disconnect()
			box.removeEventListener('scroll', mark)
		}
	}, [])
	const ref = useCallback(el => {
		own.current = el
		if (scrollRef) scrollRef.current = el
	}, [scrollRef])
	return <div className="sp-chat__scroll" ref={ref} {...rest}>{children}</div>
}

/** The messages, oldest first, in the part that scrolls; an answer is read out when it arrives.
    @param {object} props
    @param {import('react').Ref<HTMLDivElement>} [props.scrollRef]
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The messages, oldest first, with day lines between days. */
export function ChatThread({ scrollRef, children, ...rest }) {
	reject(rest, 'ChatThread')
	return (
		<ChatScroll scrollRef={scrollRef}>
			<div className="sp-chat__thread" role="log" aria-live="polite" aria-label="Conversation" {...rest}>{children}</div>
		</ChatScroll>
	)
}

/** The empty conversation: the empty state, and the example questions under it.
    @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The empty state, then the example questions. */
export function ChatStart({ children, ...rest }) {
	reject(rest, 'ChatStart')
	return <div className="sp-chat__start" {...rest}>{children}</div>
}

/** @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The example questions, one ChatPick each. */
export function ChatExamples({ children, ...rest }) {
	reject(rest, 'ChatExamples')
	return <div className="sp-chat__examples" {...rest}>{children}</div>
}

/** One message: its `mark` outside the bubble, and `end` after it. `mine` is the reader's own, at the right.
    `time` is the time read under it and `sentAt` its ISO moment; an answer being written has none.
    @param {object} props
    @param {boolean} [props.mine] The reader's own message, at the right.
    @param {import('react').ReactElement} [props.mark] The mark outside the bubble.
    @param {import('react').ReactElement} [props.end] A part after the bubble, such as the save button.
    @param {string} [props.time] The time shown under the message.
    @param {string} [props.sentAt] The moment it was sent, as an ISO time.
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The question or the answer. */
export function ChatMessage({ mine = false, mark, end, time, sentAt, children, ...rest }) {
	reject(rest, 'ChatMessage')
	if (time && !sentAt) console.error('<ChatMessage> a time names its moment in sentAt')
	return <>
		<div className={join('sp-chat__msg', mine && 'sp-chat__msg--mine')} {...rest}>{mark}{children}{end}</div>
		{time ? <time className="sp-chat__time" dateTime={sentAt}>{time}</time> : null}
	</>
}

/** The day line that opens a conversation and stands wherever the day changes: Today, Yesterday, 12 Oct.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The day, such as Today or 12 Oct. */
export function ChatDivider({ children, ...rest }) {
	reject(rest, 'ChatDivider')
	return <div className="sp-divider" {...rest}>{children}</div>
}

/** The reader's question, as they asked it.
    @param {object} props
    @param {import('react').ReactNode} [props.children] The question, as the reader asked it. */
export function ChatQuestion({ children, ...rest }) {
	reject(rest, 'ChatQuestion')
	return <div className="sp-chat__question" {...rest}>{children}</div>
}

/** Saves a question or, `saved`, removes it again; `tip` says why it is disabled.
    @param {object} props
    @param {boolean} [props.saved] The question is saved: pressing removes it again.
    @param {boolean} [props.disabled] The button is off.
    @param {string} [props.tip] Why the button is off.
    @param {() => void} [props.onClick] */
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

/** Spendly's answer: `working` while it comes, saying `doing`, `failed` with Try again, or the reply.
    @param {object} props
    @param {keyof typeof REPLY_STATE} [props.state] `answered` shows the reply; `working` says what Spendly is doing; `failed` offers Try again.
    @param {string} [props.doing] What Spendly is doing while it works.
    @param {() => void} [props.onRetry]
    @param {import('react').ReactNode} [props.children] The reply. */
export function ChatReply({ state = 'answered', doing = 'Reading your orders', onRetry, children, ...rest }) {
	reject(rest, 'ChatReply')
	pick(REPLY_STATE, state, 'state', 'ChatReply')
	if (state === 'working') return <div className="sp-chat__working" {...rest}><Spinner /><span>{doing}</span></div>
	return (
		<div className="sp-chat__reply" {...rest}>
			{state === 'failed'
				? <><p className="sp-chat__failed">Spendly could not answer that just now.</p><Button variant="outline" size="small" onClick={onRetry}>Try again</Button></>
				: children}
		</div>
	)
}

/** A small table of figures inside an answer, framed as a block.
    @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] A small table of figures. */
export function ChatFigures({ children, ...rest }) {
	reject(rest, 'ChatFigures')
	return <div className="sp-chat__figures" {...rest}>{children}</div>
}

/* ---------- what an answer holds besides its words (Ask 24d) ---------- */

const FILE_STATE = { ready: null, making: null, failed: null, gone: 'gone' }
const FILE_GONE = { deleted: 'Deleted', expired: 'Removed after 30 days' }

/** The frame one answer's files share, a row per file, a rule between rows. Also the list on Files (24e).
    @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] One ChatFile for each file. */
export function ChatFiles({ children, ...rest }) {
	reject(rest, 'ChatFiles')
	return <div className="sp-chat__files" {...rest}>{children}</div>
}

/** One file: the mark, the file's name as its title, its `kind` (the format's name, Excel) and size, and what can be done with it.
    `keptUntil`, `chatTo` (Open chat) and `onDelete` are the Files page's; a file that could not be made
    never reads as ready. A kept chat on Chats is the same row: its `icon`, the title linked `to` it, and
    its own `meta` line in place of a file's.
    @param {object} props
    @param {string} props.title The file's name without the time it was made: "Orders at Bilka in 2026.xlsx".
    @param {string} [props.kind] The format's name as the server sends it: "Excel", "CSV".
    @param {string} [props.size] Already formatted: "18 KB", "1.2 MB".
    @param {keyof typeof FILE_STATE} [props.state] `ready`, `making`, `failed` or `gone`.
    @param {string} [props.reason] Why it could not be made, one line.
    @param {keyof typeof FILE_GONE} [props.gone] Why it is gone: `deleted`, or `expired` after 30 days.
    @param {string} [props.keptUntil] The last day it is kept, ISO 8601.
    @param {string} [props.href] The download.
    @param {string} [props.to] Makes the title a link to a kept chat.
    @param {import('./Icon.jsx').IconName} [props.icon] The icon at the start.
    @param {import('react').ReactNode} [props.meta] The grey line under the title, in place of a file's kind and size.
    @param {string} [props.chatTo] The address of the chat the file came from: adds Open chat.
    @param {() => void} [props.onDelete] Offers Delete after Download. */
export function ChatFile({ title, kind, size, state = 'ready', reason, gone, keptUntil, href, to, icon = 'file-text', meta: line, chatTo, onDelete, ...rest }) {
	reject(rest, 'ChatFile')
	pick(FILE_STATE, state, 'state', 'ChatFile')
	if (!line && !kind) console.error('<ChatFile> a file names its kind')
	if (state === 'failed' && !reason) console.error('<ChatFile> a file that could not be made says why')
	if (state === 'gone' && !(gone in FILE_GONE)) console.error(`<ChatFile> gone="${gone}" is not one of: ${Object.keys(FILE_GONE).join(' | ')}`)
	if (state === 'ready' && !href && !to) console.error('<ChatFile> a ready file needs its href')
	// the day is never broken across two lines on a phone's narrow row
	const kept = keptUntil ? <> · Kept until <span className="sp-nowrap">{keptUntil}</span></> : null
	let meta = <>{line ?? join(kind, size && `· ${size}`)}{kept}</>
	if (state === 'failed') meta = `Could not be made: ${reason}`
	else if (state === 'making') meta = `${kind} · Being made`
	else if (state === 'gone') meta = `${kind} · ${FILE_GONE[gone]}`
	return (
		<div className="sp-chat__file" data-state={FILE_STATE[state] || undefined} {...rest}>
			<Mark size="medium" fill="none" aria-hidden="true" aria-label={kind ?? title}><Icon name={icon} /></Mark>
			<span className="sp-stacked">
				{to
					? <Link className="sp-chat__file-name sp-truncate" to={to} title={title}>{title}</Link>
					: <span className="sp-chat__file-name sp-truncate" title={title}>{title}</span>}
				<span className={join('sp-meta', state === 'failed' && 'sp-chat__failed')}>{meta}</span>
			</span>
			{state === 'ready' && chatTo ? <IconButton variant="outline" icon="message-circle" to={chatTo} aria-label={`Open the chat of ${title}`} data-tip="Open chat" /> : null}
			{state === 'ready' && href ? <IconButton variant="outline" icon="download" href={href} aria-label={`Download ${title}`} data-tip="Download" /> : null}
			{state === 'ready' && onDelete ? <IconButton variant="outline" icon="trash" onClick={onDelete} aria-label={`Delete ${title}`} data-tip="Delete" /> : null}
			{state === 'making' ? <IconButton variant="outline" icon={<Spinner />} disabled aria-label="Being made" /> : null}
		</div>
	)
}

/** A chart in an answer: the figure frame a table uses, the chart's `name` and its period or total,
    then the chart, or the line `failed` says why it could not be made in its place.
    @param {object} props
    @param {string} props.name "Spending per month".
    @param {import('react').ReactNode} [props.meta] The chart's period or total, such as Oct 2025 - Sep 2026.
    @param {string} [props.failed] Why it could not be made, in place of the chart: the frame and the name stay.
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] Bars, or the Donut and its Shares inside ChatShares, then the Legend when there is more than one series. */
export function ChatChart({ name, meta, failed, children, ...rest }) {
	reject(rest, 'ChatChart')
	if (failed && children) console.error('<ChatChart> a chart that could not be made draws nothing')
	return (
		<ChatFigures {...rest}>
			<div className="sp-chat__chart">
				<div className="sp-chat__chart-name">
					<span className="sp-section-label">{name}</span>
					{meta ? <span className="sp-meta">{meta}</span> : null}
				</div>
				{failed ? <p className="sp-chat__failed">{failed}</p> : children}
			</div>
		</ChatFigures>
	)
}

/** The Donut beside its Shares where the bubble has room, above them where not.
    @param {object} props
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The Donut, then its Shares. */
export function ChatShares({ children, ...rest }) {
	reject(rest, 'ChatShares')
	return <div className="sp-chat__shares" {...rest}>{children}</div>
}

/** A saved question on the empty page: pressing it sends it, and the x beside it removes it. One
    line, cut with ... past 320px, the whole question in its tooltip.
    @param {object} props
    @param {string} props.question The saved question. Long ones are cut, and the whole one is in the tooltip.
    @param {boolean} [props.disabled] The question cannot be sent now.
    @param {() => void} [props.onChoose]
    @param {() => void} [props.onRemove] */
export function ChatPick({ question, disabled = false, onChoose, onRemove, ...rest }) {
	reject(rest, 'ChatPick')
	return (
		<span className="sp-chat__pick">
			<Button variant="outline" size="small" disabled={disabled} title={question} onClick={onChoose}><span className="sp-truncate">{question}</span></Button>
			{onRemove ? <IconButton icon={<Icon name="x" size={9} />} size="small" aria-label={`Remove ${question}`} onClick={onRemove} /> : null}
		</span>
	)
}

/** What Ask can do (24c): a part for each kind of thing Ask makes, as the server lists them: its name, its
    formats on one line and one example question, or `off`, why it makes nothing here.
    @param {object} props
    @param {{ name: string, formats?: string[], example?: string, off?: string }[]} props.makes What Ask can make, as the server lists it: each one's name, formats and an example question, or why it is off.
    @param {boolean} [props.disabled] The examples cannot be sent now.
    @param {(question: string) => void} props.onChoose */
export function ChatHelp({ makes, disabled = false, onChoose, ...rest }) {
	reject(rest, 'ChatHelp')
	return (
		<div className="sp-chat__help">
			{makes.map(m => (
				<div key={m.name} className="sp-chat__help-part">
					<span className="sp-section-label">{m.name}</span>
					{m.off
						? <span className="sp-dialog__body">{m.off}</span>
						: <>
							<span className="sp-chat__formats">{m.formats.join(', ')}</span>
							<ChatPick question={m.example} disabled={disabled} onChoose={() => onChoose(m.example)} />
						</>}
				</div>
			))}
		</div>
	)
}

/** The day's limit pinned at the top of the chat (24b 3, 4), as `Chat`'s first child: shown with 3 or fewer
    questions `left`, absent with more or with no limit (`left` null).
    @param {object} props
    @param {number | null} props.left How many questions are left today. The line shows only at 3 or fewer. Null means no limit. */
export function ChatLimit({ left }) {
	if (left == null || left > 3) return null
	return left === 0
		? <Alert mark="!" title="No questions left today">You can ask again tomorrow from 00:00. This chat stays on Chats.</Alert>
		: <Alert mark="!" title={`${plural(left, 'question')} left today`}>The count starts again tomorrow from 00:00.</Alert>
}

/** Under the thread: the field with What Ask can do at its edge (`onHelp`, never disabled), and Send, or Stop
    while `working`, then `end`. `bar` pins it above a phone's tab bar.
    @param {object} props
    @param {boolean} [props.bar] Sit above a phone's tab bar.
    @param {string} props.value The words in the field.
    @param {(value: string) => void} props.onChange
    @param {() => void} [props.onSend]
    @param {() => void} [props.onStop]
    @param {() => void} [props.onHelp]
    @param {boolean} [props.working] Spendly is answering: Send becomes Stop.
    @param {boolean} [props.disabled] The field and Send are off.
    @param {import('react').Ref<HTMLTextAreaElement>} [props.fieldRef]
    @param {string} [props.placeholder] Grey words while the field is empty.
    @param {import('react').ReactElement} [props.end] A part after Send, such as the conversation menu. */
export function ChatDock({ bar = false, value, onChange, onSend, onStop, onHelp, working = false, disabled = false, fieldRef, placeholder, end, ...rest }) {
	reject(rest, 'ChatDock')
	const size = bar ? 'small' : 'standard'
	return (
		<div className={join('sp-chat__dock', bar && 'sp-chat__dock--bar')}>
			<div className="sp-chat__composer">
				<span className="sp-field__wrap sp-chat__wrap">
					<textarea ref={fieldRef} className="sp-textarea sp-chat__field" name="question" rows={1} value={value} disabled={disabled}
						onChange={ev => onChange(ev.target.value)} placeholder={placeholder} aria-label="Ask" {...rest} />
					<button type="button" className="sp-icon-btn sp-icon-btn--field sp-field__trail" aria-label="What Ask can do" aria-haspopup="dialog"
						data-tip="What Ask can do" onClick={onHelp}><Icon name="help-circle" size={15} /></button>
				</span>
				{working
					? <Button variant="outline" size={size} onClick={onStop}>Stop</Button>
					: <Button size={size} disabled={disabled || !value.trim()} onClick={onSend}>Send</Button>}
				{end}
			</div>
		</div>
	)
}

/** The conversation menu beside Send (24c): the button, and `children`, the Menu it opens upward. A
    choice in the menu closes it. On Chats and Files it is `back`, the link back to the chat.
    @param {object} props
    @param {string} [props.back] On Chats and Files: the address back to the chat, in place of the menu.
    @param {import('react').ReactElement | import('react').ReactElement[]} [props.children] The Menu the button opens. */
export function ChatMore({ back, children, ...rest }) {
	reject(rest, 'ChatMore')
	const [open, setOpen] = useState(false)
	const box = useRef(null)
	const keys = useMenuButton(box, open)
	useMenuPlace(box, open)
	useDismiss(box, open, () => setOpen(false))
	if (back) return <div className="sp-chat__more" {...rest}><IconButton icon="chevron-left" variant="outline" to={back} aria-label="Back to chat" data-tip="Back to chat" /></div>
	return (
		<div className="sp-chat__more" ref={box} data-open={open ? 'true' : 'false'} data-menu-open={open ? 'true' : undefined} {...keys}
			onClick={ev => { if (ev.target.closest('.sp-menu__item:not(:disabled)')) setOpen(false) }} {...rest}>
			<IconButton icon="dots-vertical" variant="outline" aria-label="Conversation menu" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} data-tip="More" onClick={() => setOpen(!open)} />
			<MenuHostOf open={open} box={box}>{open ? children : null}</MenuHostOf>
		</div>
	)
}

