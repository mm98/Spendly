import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChatFile, ChatFiles, ChatStart } from '../components/Chat.jsx'
import { Button } from '../components/Button.jsx'
import { Failed } from '../components/Failed.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Controls, ListMore } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { deleteChat, failureMessage, getChats, restoreChat } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { forgetChat } from '../app/assistant.js'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'

const STEP = 25

/** Chats (24f): every chat kept, latest asked first, to open again, search or delete with the files
    its answers made. */
export default function AskChats() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const [query, setQuery] = useState('')
	const [pages, setPages] = useState(1)
	const list = useApi(getChats, [{ q: query.trim(), pageSize: STEP * pages }])

	const problem = (e, fallback) => toast({ message: failureMessage(e, fallback), color: 'danger' })
	const remove = chat => {
		deleteChat(chat.id).then(
			out => {
				forgetChat(chat.id)
				toast({
					message: out.files ? `Chat and its ${plural(out.files, 'file')} deleted` : 'Chat deleted',
					undo: { label: 'Undo', onClick: () => restoreChat(chat.id).catch(e => problem(e, 'The chat could not be brought back.')) }
				})
			},
			e => problem(e, 'The chat was not deleted. Try again.')
		)
	}

	const data = list.data
	const searching = !!query.trim()
	const mark = <Mark size="large" fill="none" aria-hidden="true" aria-label="Chats"><Icon name="message-circle" /></Mark>
	let body
	if (list.error && !data) body = <Failed what="Your chats" error={list.error} onRetry={list.refresh} />
	else if (!data) body = <ChatFiles aria-busy="true"><Skeleton shape="line" /></ChatFiles>
	else if (!data.chats.length) {
		body = (
			<ChatStart>
				<Empty>
					{mark}
					{searching
						? <><EmptyTitle>No chats found</EmptyTitle><EmptyBody>Try another word, or clear the search.</EmptyBody></>
						: <><EmptyTitle>No chats yet</EmptyTitle><EmptyBody>Ask Spendly something, and the chat is kept here for {data.keptDays} days after its last message.</EmptyBody></>}
				</Empty>
			</ChatStart>
		)
	}
	else {
		body = (
			<>
				<ChatFiles>
					{data.chats.map(c => (
						<ChatFile key={c.id} icon="message-circle" title={c.heading} to={`/ask/${c.id}`}
							meta={[plural(c.questions, 'question'), c.files ? plural(c.files, 'file') : null].filter(Boolean).join(' · ')}
							keptUntil={c.keptUntil} onDelete={() => remove(c)} />
					))}
				</ChatFiles>
				<ListMore loose shown={data.chats.length} total={data.matched} pageSize={STEP} onMore={() => setPages(pages + 1)} />
			</>
		)
	}

	const search = <SearchInput value={query} onChange={q => { setQuery(q); setPages(1) }} placeholder="Search chats" aria-label="Search chats" />
	let count = null
	if (data?.total) count = searching ? `${data.matched} of ${plural(data.total, 'chat')}` : plural(data.total, 'chat')
	return (
		<>
			{touch
				? <><ScreenBar title="Chats" onBack={() => navigate('/ask')} />{data?.total ? search : null}</>
				: (
					<Controls>
						<Button variant="outline" to="/ask">Back to Ask</Button>
						{data?.total ? search : <span className="sp-grow" />}
						{count ? <span className="sp-meta">{count}</span> : null}
					</Controls>
				)}
			{body}
		</>
	)
}
