import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Chat, ChatDivider, ChatDock, ChatExamples, ChatLimit, ChatMessage, ChatMore, ChatPick, ChatQuestion, ChatReply, ChatSave, ChatStart, ChatThread, SpendlyMark } from '../components/Chat.jsx'
import { IconButton } from '../components/Button.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Anchor, Menu, MenuItem, MenuSeparator, useToast, Leaving } from '../components/Overlays.jsx'
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
import { phrase, usePhrase } from '../language/phrases.js'

/** Ask (24a): a chat at /ask/:chatId, the saved questions, and the conversation menu (24c), on a phone the top
    bar's (7a). /ask shows the chat open last in this visit, or the empty page; `?file=ID` opens the answer that made it. */
export default function Ask() {
	const phrase = usePhrase()
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
		toast({ message: phrase('ask.gone'), color: 'danger' })
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
		done.catch(e => problem(e, phrase(kept ? 'ask.question.notRemoved' : 'ask.question.notSaved')))
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
				toast({ message: phrase('ask.sentTo', { email: out.email, b: words => <b className="sp-break">{words}</b> }) })
			},
			e => problem(e, phrase(e.status === 429 ? 'ask.email.wait' : 'ask.email.failed'))
		).finally(() => setSending(false))
	}

	let emailLabel = phrase('ask.email')
	if (sending) emailLabel = phrase('ask.email.sending')
	else if (emailed) emailLabel = phrase('ask.email.sent')
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
	else if (chat.status === 'failed') opening = <ChatStart><Failed what={phrase('ask.thisChat')} error={chat.error} onRetry={() => showChat(chat.id)} /></ChatStart>

	return (
		<>
			{touch
				? <ScreenBar place title={phrase('page.ask')} onBack={() => navigate('/more')}
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
										end={<ChatSave saved={isSaved} disabled={!savedList || full} tip={full ? phrase('ask.savedFull', { count: savedMost }) : undefined}
											onClick={() => toggleSaved(t.question)} />}>
										<ChatQuestion>{t.question}</ChatQuestion>
									</ChatMessage>,
									t.state === 'stopped' ? null : dayLine(`da${t.id}`, answeredAt),
									t.state === 'stopped'
										? null
										: (
											<ChatMessage key={`a${t.id}`} mark={<SpendlyMark />} data-turn={t.id} {...timeOf(answeredAt, t.state === 'answered' ? t : null)}>
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
								<EmptyTitle>{phrase('ask.empty.title')}</EmptyTitle>
								<EmptyBody>{phrase('ask.empty.body')}</EmptyBody>
							</Empty>
							{saved.length
								? (
									<ChatExamples>
										{saved.map(s => <ChatPick key={s.id} question={s.question} disabled={noneLeft} onChoose={() => send(s.question)} onRemove={() => toggleSaved(s.question)} />)}
									</ChatExamples>
								)
								: savedList ? <span className="sp-meta">{phrase('ask.savedHint')}</span> : null}
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
					placeholder={phrase(noneLeft ? 'chat.limit.none' : touch && turns.length ? 'ask.followUp' : 'ask.placeholder')}
					end={touch
						? null
						: <ChatMore><Menu position="floating" aria-label={phrase('chat.conversation')}>{items}</Menu></ChatMore>}
				/>
			</Chat>
			<Leaving>{help}</Leaving>
		</>
	)
}

// the time under a message, from epoch seconds; none while there is none. An answer's time carries what it took
// on the server, when that was kept: "14:32 (2300 ms, 3410 tokens, 2 rounds)"
const tookOf = turn => [
	turn?.answerMs != null && phrase('ask.took.ms', { ms: turn.answerMs }),
	turn?.answerTokens != null && phrase('ask.took.tokens', { count: turn.answerTokens }),
	turn?.answerRounds != null && phrase('ask.took.rounds', { count: turn.answerRounds })
].filter(Boolean).join(', ')
const timeOf = (at, turn) => {
	if (!at) return {}
	const took = tookOf(turn)
	return { time: took ? `${messageTime(at)} (${took})` : messageTime(at), sentAt: new Date(at * 1000).toISOString() }
}

/* The reader's own mark, the one the sidebar's account row shows: the photo, or initials on its swatch. */
function AccountMark({ name, email, picture }) {
	if (picture) return <Mark size="small" fill="photo" round aria-hidden="true" aria-label={name || email}><img src={picture} alt="" /></Mark>
	return <Mark size="small" fill="solid" swatch="primary-3" round aria-hidden="true" aria-label={name || email}><>{initialsOf(name || email.split('@')[0])}</></Mark>
}

/* The conversation menu's items (24c): Chats and Files, Email this chat in the state of its send, and New chat. */
function ConversationItems({ mails, emailLabel, emailIcon, canEmail, canStartNew, onEmail, onNew }) {
	const phrase = usePhrase()
	return <>
		<MenuItem icon="message-circle" to="/ask/chats">{phrase('page.chats')}</MenuItem>
		<MenuItem icon="paperclip" to="/ask/files">{phrase('page.files')}</MenuItem>
		{mails ? <MenuItem icon={emailIcon} disabled={!canEmail} onClick={onEmail}>{emailLabel}</MenuItem> : null}
		<MenuSeparator />
		<MenuItem icon="plus" disabled={!canStartNew} onClick={onNew}>{phrase('ask.newChat')}</MenuItem>
	</>
}

/* The phone's top bar menu (Mobile screens 7a): the same items as the menu beside Send. */
function ConversationMenu({ children }) {
	const phrase = usePhrase()
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open} onClick={ev => { if (ev.target.closest('.sp-menu__item:not(:disabled)')) close() }}>
			<IconButton icon="dots-vertical" aria-label={phrase('chat.menu')} aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open ? <Menu position="floating" aria-label={phrase('chat.conversation')}>{children}</Menu> : null}
		</Anchor>
	)
}
