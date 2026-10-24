import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { join, pick, reject } from './variants.js'
import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'
import { MenuHostOf, useMenuButton, useMenuPlace } from './Overlays.jsx'
import { Spinner, useDismiss } from './Utilities.jsx'

/* ---------- chat (c34, Ask 24a) ---------- */

// the sidebar brand's mark: what speaks for Spendly beside each answer and over the empty page
export const SpendlyMark = ({ size = 'small' }) => <Mark size={size} fill="solid" aria-hidden="true" aria-label="Spendly"><span>S</span></Mark>

/** The conversation and the dock under it, filling the content column. `spaced` is the inner one on
    Chats and Files (24e, 24f), holding the controls bar 12 above the list. */
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
    while more lies past it, measured again on a scroll, a new message, a font or a resize. */
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

/** The messages, oldest first, in the part that scrolls; an answer is read out when it arrives. */
export function ChatThread({ scrollRef, children, ...rest }) {
	reject(rest, 'ChatThread')
	return (
		<ChatScroll scrollRef={scrollRef}>
			<div className="sp-chat__thread" role="log" aria-live="polite" aria-label="Conversation" {...rest}>{children}</div>
		</ChatScroll>
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

/** One message: its `mark` outside the bubble, and `end` after it. `mine` is the reader's own, at the right.
    `time` is the time read under it and `sentAt` its ISO moment; an answer being written has none. */
export function ChatMessage({ mine = false, mark, end, time, sentAt, children, ...rest }) {
	reject(rest, 'ChatMessage')
	if (time && !sentAt) console.error('<ChatMessage> a time names its moment in sentAt')
	return <>
		<div className={join('sp-chat__msg', mine && 'sp-chat__msg--mine')} {...rest}>{mark}{children}{end}</div>
		{time ? <time className="sp-chat__time" dateTime={sentAt}>{time}</time> : null}
	</>
}

/** The day line that opens a conversation and stands wherever the day changes: Today, Yesterday, 12 Oct. */
export function ChatDivider({ children, ...rest }) {
	reject(rest, 'ChatDivider')
	return <div className="sp-divider" {...rest}>{children}</div>
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

/** Spendly's answer: `working` while it comes, saying `doing`, `failed` with Try again, or the reply. */
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

/** A small table of figures inside an answer, framed as a block. */
export function ChatFigures({ children, ...rest }) {
	reject(rest, 'ChatFigures')
	return <div className="sp-chat__figures" {...rest}>{children}</div>
}

/* ---------- what an answer holds besides its words (Ask 24d) ---------- */

const FILE_STATE = { ready: null, making: null, failed: null, gone: 'gone' }
const FILE_GONE = { deleted: 'Deleted', expired: 'Removed after 30 days' }

/** The frame one answer's files share, a row per file, a rule between rows. Also the list on Files (24e). */
export function ChatFiles({ children, ...rest }) {
	reject(rest, 'ChatFiles')
	return <div className="sp-chat__files" {...rest}>{children}</div>
}

/** One file: the mark, the file's name as its title, its `kind` (the format's name, Excel) and size, and what can be done with it.
    `keptUntil`, `chatTo` (Open chat) and `onDelete` are the Files page's; a file that could not be made
    never reads as ready. A kept chat on Chats is the same row: its `icon`, the title linked `to` it, and
    its own `meta` line in place of a file's. */
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
    then the chart, or the line `failed` says why it could not be made in its place. */
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

/** The Donut beside its Shares where the bubble has room, above them where not. */
export function ChatShares({ children, ...rest }) {
	reject(rest, 'ChatShares')
	return <div className="sp-chat__shares" {...rest}>{children}</div>
}

/** A saved question on the empty page: pressing it sends it, and the x beside it removes it. One
    line, cut with ... past 320px, the whole question in its tooltip. */
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
    formats on one line and one example question, or `off`, why it makes nothing here. */
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

/** Under the thread: the field with What Ask can do at its edge (`onHelp`, never disabled), and Send, or Stop
    while `working`, then `end`. `bar` pins it above a phone's tab bar. The line under the field shows only `left`. */
export function ChatDock({ bar = false, value, onChange, onSend, onStop, onHelp, working = false, disabled = false, fieldRef, placeholder, left, end, ...rest }) {
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
			{left
				? (
					<div className="sp-chat__hint">
						<span className="sp-grow" />
						<span className="sp-meta--over">{left}</span>
					</div>
				)
				: null}
		</div>
	)
}

/** The conversation menu beside Send (24c): the button, and `children`, the Menu it opens upward. A
    choice in the menu closes it. On Chats and Files it is `back`, the link back to the chat. */
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

