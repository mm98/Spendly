import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Chat, ChatDock, ChatExamples, ChatMessage, ChatPick, ChatQuestion, ChatReply, ChatSave, ChatSavedMenu, ChatStart, ChatThread, SpendlyMark } from '../components/Chat.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Controls } from '../components/List.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Alert, Anchor, Menu, MenuItem, useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Spinner, useDismiss } from '../components/Utilities.jsx'
import { emailConversation, failureMessage, getAssistant, getCurrentUser, getSavedQuestions, removeSavedQuestion, saveQuestion } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { answeredTurns, ask, askAgain, clearConversation, noteEmailed, restoreConversation, stopAsking, useConversation, wasEmailed } from '../app/assistant.js'
import { AnswerText } from '../app/assistantAnswer.jsx'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'

/** Ask Spendly (24a): a conversation about the reader's own money, the questions they saved, and
    Clear and Email this chat. The saved questions are on the empty page, and on a desktop also in
    the controls bar; on a phone Clear and Email sit in the top bar's menu (Mobile screens 7a). */
export default function Ask() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const assistant = useApi(getAssistant).data
	const account = useApi(getCurrentUser).data
	const turns = useConversation(account?.id)
	const savedList = useApi(getSavedQuestions, [], { enabled: !!assistant?.ready }).data
	const [text, setText] = useState('')
	const [sending, setSending] = useState(false)
	const field = useRef(null)
	const scroller = useRef(null)

	const working = turns.some(t => t.state === 'working')
	const noneLeft = !!assistant?.ready && assistant.left === 0
	const left = assistant?.left
	const saved = savedList?.questions ?? []
	const savedMost = savedList?.most ?? 0
	const emailed = wasEmailed(turns)
	const lastFailed = turns.at(-1)?.state === 'failed'
	const canEmail = turns.some(t => t.state === 'answered') && !working && !lastFailed && !sending && !emailed
	const canClear = turns.length > 0 && !working
	// a server that cannot send email hides its email features (README, server settings)
	const mails = !!account?.mail

	// the field takes focus as the page opens; a phone would raise its keyboard over the conversation
	useEffect(() => { if (!touch) field.current?.focus() }, [touch])
	// Send and Stop swap in one place: focus that went with the one that left comes back to the field
	useEffect(() => { if (document.activeElement === document.body) field.current?.focus() }, [working])
	// opening the page, and every new message, shows the latest one
	const latest = turns.at(-1)
	useLayoutEffect(() => {
		const box = scroller.current
		if (box) box.scrollTop = box.scrollHeight
	}, [turns.length, latest?.state, noneLeft])

	const send = useCallback(question => {
		if (working || noneLeft || !question.trim() || !account) return
		ask(account.id, question)
		setText('')
	}, [working, noneLeft, account])

	if (assistant && !assistant.ready) return <Navigate to="/" replace />

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

	const clear = () => {
		const held = clearConversation()
		toast({ message: 'Conversation cleared', undo: { label: 'Undo', onClick: () => restoreConversation(held) } })
		field.current?.focus()
	}
	const email = () => {
		if (!canEmail) return
		const sent = turns
		setSending(true)
		emailConversation(answeredTurns(sent)).then(
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

	const mine = account ? <AccountMark name={account.name} email={account.email} picture={account.picture} /> : null

	return (
		<>
			{touch
				? <ScreenBar place title="Ask Spendly" onBack={() => navigate('/more')}
					end={<ConversationMenu mails={mails} emailLabel={emailLabel} canEmail={canEmail} canClear={canClear} onEmail={email} onClear={clear} />} />
				: (
					<Controls>
						{turns.length && saved.length ? <ChatSavedMenu questions={saved.map(s => s.question)} disabled={noneLeft} onSend={send} /> : null}
						<span className="sp-grow" />
						{mails ? <Button variant="outline" disabled={!canEmail} onClick={email}>{sending ? <><Spinner />{emailLabel}</> : emailLabel}</Button> : null}
						<Button variant="outline" disabled={!canClear} onClick={clear}>Clear</Button>
					</Controls>
				)}
			<Chat>
				{turns.length
					? (
						<ChatThread scrollRef={scroller}>
							{turns.map(t => {
								const isSaved = saved.some(s => s.question === t.question)
								const full = !isSaved && saved.length >= savedMost
								return [
									<ChatMessage key={`q${t.id}`} mine mark={mine}
										end={<ChatSave saved={isSaved} disabled={!savedList || full} tip={full ? `${savedMost} saved. Remove one to save another.` : undefined}
											onClick={() => toggleSaved(t.question)} />}>
										<ChatQuestion>{t.question}</ChatQuestion>
									</ChatMessage>,
									t.state === 'stopped'
										? null
										: (
											<ChatMessage key={`a${t.id}`} mark={<SpendlyMark />}>
												<ChatReply state={t.state} onRetry={() => askAgain(t.id)}>
													{t.state === 'answered' ? <AnswerText text={t.answer} onOpen={to => navigate(to)} /> : null}
												</ChatReply>
											</ChatMessage>
										)
								]
							})}
							{noneLeft
								? <Alert mark="!" title="No questions left today">You can ask again tomorrow from 00:00. This conversation stays until you leave.</Alert>
								: null}
						</ChatThread>
					)
					: (
						<ChatStart>
							<Empty>
								<SpendlyMark size="large" />
								<EmptyTitle>Ask about your money</EmptyTitle>
								<EmptyBody>Answers come from your orders, vendors, categories and budget. Asking never changes anything.</EmptyBody>
							</Empty>
							{saved.length
								? (
									<ChatExamples>
										{saved.map(s => <ChatPick key={s.id} question={s.question} disabled={noneLeft} onSend={() => send(s.question)} onRemove={() => toggleSaved(s.question)} />)}
									</ChatExamples>
								)
								: savedList ? <span className="sp-meta">Save a question with the bookmark beside it, and it shows here.</span> : null}
						</ChatStart>
					)}
				<ChatDock
					bar={touch}
					value={text}
					onChange={setText}
					onKeyDown={keys}
					onSend={() => send(text)}
					onStop={stopAsking}
					working={working}
					disabled={noneLeft}
					fieldRef={field}
					placeholder={noneLeft ? 'No questions left today' : touch && turns.length ? 'Ask a follow-up' : 'Ask about your orders, vendors and budget'}
					left={left > 0 && left <= 3 ? `${plural(left, 'question')} left today` : null}
				/>
			</Chat>
		</>
	)
}

/* The reader's own mark, the one the sidebar's account row shows: the photo, or initials on its swatch. */
function AccountMark({ name, email, picture }) {
	if (picture) return <Mark size="small" fill="photo" round aria-hidden="true" aria-label={name || email}><img src={picture} alt="" /></Mark>
	return <Mark size="small" fill="solid" swatch="green-3" round aria-hidden="true" aria-label={name || email}><>{initialsOf(name || email.split('@')[0])}</></Mark>
}

/* The phone's top bar menu (Mobile screens 7a): Email this chat and Clear, in the same states as the buttons. */
function ConversationMenu({ mails, emailLabel, canEmail, canClear, onEmail, onClear }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" aria-label="Conversation menu" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open
				? (
					<Menu position="floating" aria-label="Conversation">
						{mails ? <MenuItem disabled={!canEmail} onClick={() => { close(); onEmail() }}>{emailLabel}</MenuItem> : null}
						<MenuItem disabled={!canClear} onClick={() => { close(); onClear() }}>Clear</MenuItem>
					</Menu>
				)
				: null}
		</Anchor>
	)
}
