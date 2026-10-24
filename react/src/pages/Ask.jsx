import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Chat, ChatDivider, ChatDock, ChatExamples, ChatLimit, ChatMessage, ChatMore, ChatPick, ChatQuestion, ChatReply, ChatSave, ChatStart, ChatThread, SpendlyMark } from '../components/Chat.jsx'
import { IconButton } from '../components/Button.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Anchor, Menu, MenuItem, MenuSeparator, useToast } from '../components/Overlays.jsx'
import { Failed } from '../components/Failed.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton, Spinner, useDismiss } from '../components/Utilities.jsx'
import { emailConversation, failureMessage, getAsk, getCurrentUser, getSavedQuestions, removeSavedQuestion, saveQuestion } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { dayWords, messageTime } from '../api/format.js'
import { ask, askAgain, lastChat, newChat, noteEmailed, refreshFiles, showChat, showDraft, stopAsking, useChat, wasEmailed } from '../app/ask.js'
import { AnswerText } from '../app/askAnswer.jsx'
import { useAskHelp } from '../app/askHelp.jsx'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'

// the address of a deleted or expired chat opens the empty page with this (24f)
const GONE = 'That chat is no longer kept.'

/** Ask (24a): a chat at /ask/:chatId, the saved questions, and the conversation menu (24c), on a phone the top
    bar's (7a). /ask shows the chat open last in this visit, or the empty page; `?file=ID` opens the answer that made it. */
export default function Ask() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const { chatId } = useParams()
	const [params] = useSearchParams()
	const fileId = params.get('file')
	const askStatus = useApi(getAsk).data
	const account = useApi(getCurrentUser).data
	const chat = useChat(account?.id)
	const turns = chat.turns
	const savedList = useApi(getSavedQuestions, [], { enabled: !!askStatus?.ready }).data
	const [text, setText] = useState('')
	const [sending, setSending] = useState(false)
	const field = useRef(null)
	const scroller = useRef(null)

	const working = turns.some(t => t.state === 'working')
	const noneLeft = !!askStatus?.ready && askStatus.left === 0
	const left = askStatus?.ready ? askStatus.left : null
	const saved = savedList?.questions ?? []
	const savedMost = savedList?.most ?? 0
	const emailed = wasEmailed(turns)
	const lastFailed = turns.at(-1)?.state === 'failed'
	const canEmail = turns.some(t => t.state === 'answered') && !working && !lastFailed && !sending && !emailed
	const canStartNew = turns.length > 0 && !working
	// a server that cannot send email hides its email features (README, server settings)
	const mails = !!account?.mail

	// the address names the chat; /ask shows the one open last in this visit, or the draft
	const shownId = chat.id
	useEffect(() => {
		if (!account) return
		if (chatId) showChat(chatId)
		else if (lastChat()) navigate(`/ask/${lastChat()}`, { replace: true })
		else showDraft()
	}, [chatId, account, navigate])
	// a first question gets its chat's address as soon as the server names it
	useEffect(() => {
		if (!chatId && shownId) navigate(`/ask/${shownId}`, { replace: true })
	}, [chatId, shownId, navigate])
	const gone = chat.status === 'gone'
	useEffect(() => {
		if (!gone) return
		toast({ message: GONE, color: 'danger' })
		newChat()
		navigate('/ask', { replace: true })
	}, [gone, toast, navigate])

	// a file deleted on Files, or past its days, reads as gone when the conversation shows again
	useEffect(() => {
		refreshFiles()
		const back = () => { if (document.visibilityState === 'visible') refreshFiles() }
		document.addEventListener('visibilitychange', back)
		return () => document.removeEventListener('visibilitychange', back)
	}, [chat.status])
	// the field takes focus as the page opens; a phone would raise its keyboard over the conversation
	useEffect(() => { if (!touch) field.current?.focus() }, [touch])
	// Send and Stop swap in one place: focus that went with the one that left comes back to the field
	useEffect(() => { if (document.activeElement === document.body) field.current?.focus() }, [working])
	// opening the page, and every new message, shows the latest one; Open chat on Files shows the answer that made the file
	const latest = turns.at(-1)
	const fileTurn = fileId ? turns.find(t => t.made?.file?.[fileId])?.id : undefined
	useLayoutEffect(() => {
		const box = scroller.current
		if (!box) return
		const answer = fileTurn === undefined ? null : box.querySelector(`[data-turn="${fileTurn}"]`)
		if (answer) answer.scrollIntoView({ block: 'start' })
		else box.scrollTop = box.scrollHeight
	}, [turns.length, latest?.state, noneLeft, fileTurn])

	const { onHelp, help } = useAskHelp({ makes: askStatus?.makes, disabled: noneLeft, touch, field, setText })

	const send = useCallback(question => {
		if (working || noneLeft || !question.trim() || !account) return
		ask(question)
		setText('')
	}, [working, noneLeft, account])

	if (askStatus && !askStatus.ready) return <Navigate to="/" replace />

	const keys = ev => {
		if (ev.key === 'Enter' && !ev.shiftKey) {
			ev.preventDefault()
			send(text)
		}
	}

	const problem = (e, fallback) => toast({ message: failureMessage(e, fallback), color: 'danger' })
	const toggleSaved = question => {
		const kept = saved.find(s => s.question === question)
		const done = kept ? removeSavedQuestion(kept.id) : saveQuestion(question)
		done.catch(e => problem(e, kept ? 'The question was not removed. Try again.' : 'The question was not saved. Try again.'))
	}

	const startNew = () => {
		newChat()
		navigate('/ask')
		field.current?.focus()
	}
	const email = () => {
		if (!canEmail) return
		const sent = turns
		setSending(true)
		emailConversation(chat.id).then(
			out => {
				noteEmailed(sent)
				toast({ message: <>Sent to <b className="sp-break">{out.email}</b></> })
			},
			e => problem(e, e.status === 429 ? 'Wait a minute before emailing this chat again.' : 'The email could not be sent. Try again.')
		).finally(() => setSending(false))
	}

	let emailLabel = 'Email this chat'
	if (sending) emailLabel = 'Sending'
	else if (emailed) emailLabel = 'Emailed'
	let emailIcon = 'mail'
	if (sending) emailIcon = <Spinner />
	else if (emailed) emailIcon = 'check'

	// a day line opens the conversation and stands before each message on a new day; a message without a time has none
	let shownDay = null
	const dayLine = (key, at) => {
		if (!at) return null
		const day = dayWords(at)
		if (day === shownDay) return null
		shownDay = day
		return <ChatDivider key={key}>{day}</ChatDivider>
	}

	const mine = account ? <AccountMark name={account.name} email={account.email} picture={account.picture} /> : null
	const items = <ConversationItems mails={mails} emailLabel={emailLabel} emailIcon={emailIcon} canEmail={canEmail} canStartNew={canStartNew} onEmail={email} onNew={startNew} />
	let opening = null
	if (chat.status === 'loading' || gone) opening = <ChatThread aria-busy="true"><Skeleton shape="line" /></ChatThread>
	else if (chat.status === 'failed') opening = <ChatStart><Failed what="This chat" error={chat.error} onRetry={() => showChat(chat.id)} /></ChatStart>

	return (
		<>
			{touch
				? <ScreenBar place title="Ask" onBack={() => navigate('/more')}
					end={<ConversationMenu>{items}</ConversationMenu>} />
				: null}
			<Chat>
				<ChatLimit left={left} />
				{opening ?? (turns.length
					? (
						<ChatThread scrollRef={scroller}>
							{turns.map(t => {
								const isSaved = saved.some(s => s.question === t.question)
								const full = !isSaved && saved.length >= savedMost
								const answeredAt = t.state === 'working' ? null : t.answeredAt
								return [
									dayLine(`dq${t.id}`, t.askedAt),
									<ChatMessage key={`q${t.id}`} mine mark={mine} {...timeOf(t.askedAt)}
										end={<ChatSave saved={isSaved} disabled={!savedList || full} tip={full ? `${savedMost} saved. Remove one to save another.` : undefined}
											onClick={() => toggleSaved(t.question)} />}>
										<ChatQuestion>{t.question}</ChatQuestion>
									</ChatMessage>,
									t.state === 'stopped' ? null : dayLine(`da${t.id}`, answeredAt),
									t.state === 'stopped'
										? null
										: (
											<ChatMessage key={`a${t.id}`} mark={<SpendlyMark />} data-turn={t.id} {...timeOf(answeredAt)}>
												<ChatReply state={t.state} doing={t.doing?.doing} onRetry={() => askAgain(t.id)}>
													{t.state === 'answered' ? <AnswerText text={t.answer} made={t.made} onOpen={to => navigate(to)} /> : null}
												</ChatReply>
											</ChatMessage>
										)
								]
							})}
						</ChatThread>
					)
					: (
						<ChatStart>
							<Empty>
								<SpendlyMark size="large" />
								<EmptyTitle>Ask about your money</EmptyTitle>
								<EmptyBody>Answers come from your orders, vendors, categories, budget and statistics, and can be a file or a chart. Asking never changes anything.</EmptyBody>
							</Empty>
							{saved.length
								? (
									<ChatExamples>
										{saved.map(s => <ChatPick key={s.id} question={s.question} disabled={noneLeft} onChoose={() => send(s.question)} onRemove={() => toggleSaved(s.question)} />)}
									</ChatExamples>
								)
								: savedList ? <span className="sp-meta">Save a question with the bookmark beside it, and it shows here.</span> : null}
						</ChatStart>
					))}
				<ChatDock
					bar={touch}
					value={text}
					onChange={setText}
					onKeyDown={keys}
					onSend={() => send(text)}
					onStop={stopAsking}
					onHelp={onHelp}
					working={working}
					disabled={noneLeft || !!opening}
					fieldRef={field}
					placeholder={noneLeft ? 'No questions left today' : touch && turns.length ? 'Ask a follow-up' : 'Ask about your orders, vendors and budget'}
					end={touch
						? null
						: <ChatMore><Menu position="floating" aria-label="Conversation">{items}</Menu></ChatMore>}
				/>
			</Chat>
			{help}
		</>
	)
}

// the time under a message, from epoch seconds; none while there is none
const timeOf = at => (at ? { time: messageTime(at), sentAt: new Date(at * 1000).toISOString() } : {})

/* The reader's own mark, the one the sidebar's account row shows: the photo, or initials on its swatch. */
function AccountMark({ name, email, picture }) {
	if (picture) return <Mark size="small" fill="photo" round aria-hidden="true" aria-label={name || email}><img src={picture} alt="" /></Mark>
	return <Mark size="small" fill="solid" swatch="green-3" round aria-hidden="true" aria-label={name || email}><>{initialsOf(name || email.split('@')[0])}</></Mark>
}

/* The conversation menu's items (24c): Chats and Files, Email this chat in the state of its send, and New chat. */
function ConversationItems({ mails, emailLabel, emailIcon, canEmail, canStartNew, onEmail, onNew }) {
	return <>
		<MenuItem icon="message-circle" to="/ask/chats">Chats</MenuItem>
		<MenuItem icon="paperclip" to="/ask/files">Files</MenuItem>
		{mails ? <MenuItem icon={emailIcon} disabled={!canEmail} onClick={onEmail}>{emailLabel}</MenuItem> : null}
		<MenuSeparator />
		<MenuItem icon="plus" disabled={!canStartNew} onClick={onNew}>New chat</MenuItem>
	</>
}

/* The phone's top bar menu (Mobile screens 7a): the same items as the menu beside Send. */
function ConversationMenu({ children }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open} onClick={ev => { if (ev.target.closest('.sp-menu__item:not(:disabled)')) close() }}>
			<IconButton icon="dots-vertical" aria-label="Conversation menu" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open ? <Menu position="floating" aria-label="Conversation">{children}</Menu> : null}
		</Anchor>
	)
}
